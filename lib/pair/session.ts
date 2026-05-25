// Orchestrates the signaling WebSocket, ECDH key agreement, and the
// WebRTC data-channel handshake into a single ``PairSession`` object
// that page components drive with a few callbacks.
//
// The state machine, per [D-260524-01] / [D-0024-01]:
//
//   1. Open ``/ws/pair`` (sender carries the token in the query; receiver
//      sends ``redeem`` as its first frame).
//   2. Both peers generate ephemeral P-256 keypairs and exchange the
//      raw public keys over the signaling channel.
//   3. Sender creates the data channel and sends an SDP offer; receiver
//      answers; ICE candidates trickle through signaling.
//   4. When both the data channel is open **and** the peer public key
//      has been received, the session derives the AES-GCM-256 session
//      key + SAS via HKDF and emits ``onConnected``.
//   5. The data channel is the carrier from then on; either side closing
//      tears the session down.

import {
  deriveSessionMaterial,
  exportPublicKey,
  generateEphemeralKeypair,
  importPeerPublicKey,
  type EphemeralKeypair,
  type SessionMaterial,
} from "./crypto";
import {
  openPairSignaling,
  type ConnectOptions,
  type ServerEnvelope,
  type SignalPayload,
  type SignalingClient,
} from "./signaling";

export type PairPhase =
  | "opening_signaling"
  | "awaiting_peer" // sender waiting for receiver_connected; receiver waiting for paired
  | "negotiating" // RTC handshake + ECDH in flight
  | "connected"
  | "closed";

export interface PairSessionEvents {
  /** Fires on every phase transition so the page can mirror state. */
  onPhase?: (phase: PairPhase) => void;
  /** Fires once when both data-channel-open and session-key-derived are
   *  true. The ``sas`` is the 4-char value to show in the connect banner. */
  onConnected?: (info: { sas: string; sessionKey: CryptoKey }) => void;
  /** Inbound application data over the encrypted channel. (Decryption
   *  isn't done here yet — the next task layers AES-GCM on top.) */
  onMessage?: (data: ArrayBuffer | string) => void;
  /** Pair was refused by the server (PIN expired, sender offline,
   *  rate-limited, etc.) or torn down mid-session. ``reason`` matches
   *  the wire ``pair_failed.reason`` string when applicable. */
  onFailed?: (reason: string) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Public STUN reflexive-address discovery. TURN relays would extend
  // reach for restrictive NATs but require credentials — out of scope
  // for v1.
  { urls: "stun:stun.l.google.com:19302" },
];

export class PairSession {
  private readonly role: "sender" | "receiver";
  private readonly events: PairSessionEvents;
  private readonly signaling: SignalingClient;
  private readonly pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private ownKeypair: EphemeralKeypair | null = null;
  private peerPublicKey: CryptoKey | null = null;
  private material: SessionMaterial | null = null;
  private phase: PairPhase = "opening_signaling";
  private closed = false;
  // ICE candidates can arrive before the SDP they belong to has been
  // applied (the signaling order isn't strictly synchronised with
  // offer/answer). Buffer them until ``setRemoteDescription`` lands.
  private pendingIce: RTCIceCandidateInit[] = [];

  private constructor(
    role: "sender" | "receiver",
    apiBaseUrl: string,
    connect: ConnectOptions,
    events: PairSessionEvents,
  ) {
    this.role = role;
    this.events = events;
    this.pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
    this.setupPeerConnection();
    this.signaling = openPairSignaling(apiBaseUrl, connect, {
      onOpen: () => this.handleSignalingOpen(),
      onEnvelope: (env) => this.handleEnvelope(env),
      onClose: () => this.fail("signaling_closed"),
      onError: () => this.fail("signaling_error"),
    });
  }

  static createSender(
    apiBaseUrl: string,
    options: { pin: string; senderToken: string },
    events: PairSessionEvents,
  ): PairSession {
    return new PairSession(
      "sender",
      apiBaseUrl,
      { role: "sender", pin: options.pin, senderToken: options.senderToken },
      events,
    );
  }

  static createReceiver(
    apiBaseUrl: string,
    options: { pin: string },
    events: PairSessionEvents,
  ): PairSession {
    const session = new PairSession(
      "receiver",
      apiBaseUrl,
      { role: "receiver" },
      events,
    );
    // The receiver redeems the PIN as its first frame. The signaling
    // wrapper queues this until the socket opens; it lands on the server
    // immediately on open.
    session.signaling.send({ op: "redeem", pin: options.pin });
    return session;
  }

  /** Send a single frame over the data channel. Throws if the channel
   *  isn't open yet. */
  send(data: ArrayBuffer | string): void {
    if (this.dataChannel === null || this.dataChannel.readyState !== "open") {
      throw new Error("PairSession: data channel is not open");
    }
    if (typeof data === "string") {
      this.dataChannel.send(data);
    } else {
      this.dataChannel.send(data);
    }
  }

  /** Tear down the session. Idempotent. */
  close(reason: string = "user_closed"): void {
    if (this.closed) return;
    this.closed = true;
    this.transition("closed");
    try {
      this.dataChannel?.close();
    } catch {
      /* already closed */
    }
    try {
      this.pc.close();
    } catch {
      /* already closed */
    }
    try {
      this.signaling.close(1000, reason);
    } catch {
      /* already closed */
    }
  }

  get currentPhase(): PairPhase {
    return this.phase;
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------

  private setupPeerConnection(): void {
    this.pc.addEventListener("icecandidate", (event) => {
      // candidate === null marks end-of-candidates; forward both so the
      // peer can finalize ICE gathering.
      this.sendSignal({ type: "ice", candidate: event.candidate?.toJSON() ?? null });
    });

    this.pc.addEventListener("datachannel", (event) => {
      // Receiver path — the sender created the channel.
      this.attachDataChannel(event.channel);
    });

    if (this.role === "sender") {
      // Sender creates the channel up front so it's in the offer.
      const channel = this.pc.createDataChannel("wispr-pair", {
        ordered: true,
      });
      this.attachDataChannel(channel);
    }
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.binaryType = "arraybuffer";
    channel.addEventListener("open", () => this.maybeFireConnected());
    channel.addEventListener("close", () => {
      if (this.phase === "connected") {
        this.fail("peer_disconnected");
      }
    });
    channel.addEventListener("message", (event) => {
      this.events.onMessage?.(event.data);
    });
  }

  private handleSignalingOpen(): void {
    this.transition("awaiting_peer");
  }

  private handleEnvelope(env: ServerEnvelope): void {
    switch (env.op) {
      case "pair_failed":
        this.fail(env.reason);
        return;
      case "paired":
        // Receiver path: now we know there is a sender on the other side.
        void this.startNegotiation();
        return;
      case "receiver_connected":
        // Sender path: receiver redeemed; we can now publish our offer.
        void this.startNegotiation();
        return;
      case "signal":
        void this.handleSignal(env.payload);
        return;
    }
  }

  private async startNegotiation(): Promise<void> {
    if (this.closed) return;
    this.transition("negotiating");
    this.ownKeypair = await generateEphemeralKeypair();
    const publicKey = await exportPublicKey(this.ownKeypair.publicKey);
    this.sendSignal({ type: "ecdh", publicKey });

    if (this.role === "sender") {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal({ type: "sdp", sdp: offer });
    }
  }

  private async handleSignal(payload: SignalPayload): Promise<void> {
    if (this.closed) return;
    if (payload.type === "ecdh") {
      this.peerPublicKey = await importPeerPublicKey(payload.publicKey);
      await this.maybeDeriveSession();
      return;
    }
    if (payload.type === "sdp") {
      await this.handleSdp(payload.sdp);
      return;
    }
    if (payload.type === "ice") {
      const candidate = payload.candidate;
      if (candidate === null) {
        return; // peer signalled end-of-candidates
      }
      if (this.pc.remoteDescription === null) {
        // ICE candidates can arrive before the SDP — buffer and apply
        // once the remote description lands.
        this.pendingIce.push(candidate);
        return;
      }
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {
        /* candidate rejected; not fatal — let ICE recover */
      }
    }
  }

  private async handleSdp(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (sdp.type === "offer") {
      // Receiver path: install the offer, send back an answer.
      await this.pc.setRemoteDescription(sdp);
      await this.flushPendingIce();
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.sendSignal({ type: "sdp", sdp: answer });
      return;
    }
    if (sdp.type === "answer") {
      // Sender path: install the answer and let ICE drive to open.
      await this.pc.setRemoteDescription(sdp);
      await this.flushPendingIce();
      return;
    }
    // ``pranswer`` / ``rollback`` aren't part of the protocol.
  }

  private async flushPendingIce(): Promise<void> {
    while (this.pendingIce.length > 0) {
      const next = this.pendingIce.shift();
      if (next === undefined) break;
      try {
        await this.pc.addIceCandidate(next);
      } catch {
        /* skip stale candidate */
      }
    }
  }

  private async maybeDeriveSession(): Promise<void> {
    if (this.material !== null) return;
    if (this.ownKeypair === null || this.peerPublicKey === null) return;
    this.material = await deriveSessionMaterial(
      this.ownKeypair.privateKey,
      this.peerPublicKey,
    );
    this.maybeFireConnected();
  }

  private maybeFireConnected(): void {
    if (this.closed) return;
    if (this.phase === "connected") return;
    if (this.material === null) return;
    if (this.dataChannel === null || this.dataChannel.readyState !== "open") return;
    this.transition("connected");
    this.events.onConnected?.({
      sas: this.material.sas,
      sessionKey: this.material.sessionKey,
    });
  }

  private sendSignal(payload: SignalPayload): void {
    if (this.closed) return;
    if (this.signaling.readyState !== WebSocket.OPEN) return;
    this.signaling.send({ op: "signal", payload });
  }

  private transition(next: PairPhase): void {
    if (this.phase === next) return;
    this.phase = next;
    this.events.onPhase?.(next);
  }

  private fail(reason: string): void {
    if (this.closed) {
      // Closing tears down the signaling socket, which fires
      // ``onClose`` again — swallow the recursive fail.
      return;
    }
    if (this.phase === "connected") {
      // Mid-session disconnect: still surface as a failure but with a
      // distinct reason so the UI can render "peer disconnected" instead
      // of "couldn't pair".
      this.events.onFailed?.(reason);
    } else {
      this.events.onFailed?.(reason);
    }
    this.close(reason);
  }
}
