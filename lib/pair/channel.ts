// Application-layer encrypted channel over the WebRTC data channel.
//
// The PairSession brings up the data channel and derives the AES-GCM
// session key; this layer takes those two and gives the page a typed
// send/receive interface that handles encryption transparently.
//
// Wire frame: 12-byte fresh IV || AES-GCM-256 ciphertext (auth tag
// appended by WebCrypto). The plaintext is a JSON envelope so we can
// add file chunks and other message types in the next milestone
// without breaking the M2 text-only shape.

import { packEnvelope, unpackEnvelope } from "@/lib/crypto/encoding";
import type { MessageHandler, PairSession } from "./session";

const IV_BYTES = 12;
const AES_TAG_BYTES = 16;

export interface TextFrame {
  type: "text";
  body: string;
}

// Single message variant in M2. Discriminated by ``type`` so adding
// file/chunk frames later is purely additive — the receiver routes
// on the discriminator and ignores frames it doesn't understand.
export type IncomingFrame = TextFrame;

/** Encrypt a text frame to wire bytes. Exported separately from the
 *  channel class so tests can drive the codec without a live session. */
export async function encryptText(
  sessionKey: CryptoKey,
  text: string,
): Promise<Uint8Array> {
  const envelope: TextFrame = { type: "text", body: text };
  const plaintext = new TextEncoder().encode(JSON.stringify(envelope));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sessionKey, plaintext),
  );
  return packEnvelope(iv, ct);
}

/** Decrypt and parse a wire frame, or return ``null`` if the frame is
 *  malformed, tampered, or doesn't match a known variant. The receiver
 *  silently drops on failure rather than tearing down the channel —
 *  the auth tag check makes accidental delivery of garbage benign. */
export async function decryptFrame(
  sessionKey: CryptoKey,
  bytes: Uint8Array,
): Promise<IncomingFrame | null> {
  if (bytes.byteLength <= IV_BYTES + AES_TAG_BYTES) {
    return null;
  }
  let unpacked: { iv: Uint8Array; ciphertext: Uint8Array };
  try {
    unpacked = unpackEnvelope(bytes);
  } catch {
    return null;
  }
  let plaintext: Uint8Array;
  try {
    const decoded = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unpacked.iv },
      sessionKey,
      unpacked.ciphertext,
    );
    plaintext = new Uint8Array(decoded);
  } catch {
    // Auth tag mismatch — drop.
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    return null;
  }
  return parseFrame(parsed);
}

function parseFrame(value: unknown): IncomingFrame | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.type === "text" && typeof v.body === "string") {
    return { type: "text", body: v.body };
  }
  return null;
}

/** Couples a PairSession with the AES-GCM session key it derived.
 *  Owns the data-channel message handler and exposes a typed
 *  ``sendText`` plus an ``onIncoming`` callback for application code. */
export class EncryptedChannel {
  private incomingHandler: ((frame: IncomingFrame) => void) | null = null;
  private detach: MessageHandler;

  constructor(
    private readonly session: PairSession,
    private readonly sessionKey: CryptoKey,
  ) {
    this.detach = (data) => {
      void this.routeIncoming(data);
    };
    session.setMessageHandler(this.detach);
  }

  /** Register the incoming-message callback. ``null`` clears it
   *  (typical pattern: clear in component cleanup so a late-arriving
   *  frame doesn't stomp a stale React state setter). */
  setOnIncoming(handler: ((frame: IncomingFrame) => void) | null): void {
    this.incomingHandler = handler;
  }

  async sendText(text: string): Promise<void> {
    const frame = await encryptText(this.sessionKey, text);
    // ``send`` on the underlying PairSession takes ArrayBuffer or
    // string; pass the underlying buffer so binaryType="arraybuffer"
    // on the receiver hands us back a clean ArrayBuffer.
    const buffer = frame.buffer.slice(
      frame.byteOffset,
      frame.byteOffset + frame.byteLength,
    ) as ArrayBuffer;
    this.session.send(buffer);
  }

  /** Detach from the session. Safe to call multiple times. */
  close(): void {
    this.session.setMessageHandler(null);
    this.incomingHandler = null;
  }

  private async routeIncoming(data: ArrayBuffer | string): Promise<void> {
    if (typeof data === "string") {
      // Spec says binary frames only; ignore stray text.
      return;
    }
    const bytes = new Uint8Array(data);
    const frame = await decryptFrame(this.sessionKey, bytes);
    if (frame === null) return;
    this.incomingHandler?.(frame);
  }
}
