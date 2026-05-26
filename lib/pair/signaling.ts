// Typed WebSocket wrapper over /ws/pair.
//
// The relay is opaque from the server's perspective for ``signal``
// frames — the server only inspects the ``op`` field. Both sides
// nest their own protocol inside ``signal.payload`` (defined below):
// ECDH public keys, SDP offers/answers, and ICE candidates.

export type SignalPayload =
  | { type: "ecdh"; publicKey: string }
  | { type: "sdp"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit | null };

export type ServerEnvelope =
  | { op: "paired" }
  | { op: "receiver_connected" }
  | { op: "pair_failed"; reason: string; retry_after_seconds?: number }
  | { op: "signal"; payload: SignalPayload };

export type ClientEnvelope =
  | { op: "redeem"; pin: string }
  | { op: "signal"; payload: SignalPayload }
  | { op: "cancel" };

export type SignalingRole = "sender" | "receiver";

export interface SenderConnectOptions {
  role: "sender";
  pin: string;
  senderToken: string;
}

export interface ReceiverConnectOptions {
  role: "receiver";
}

export type ConnectOptions = SenderConnectOptions | ReceiverConnectOptions;

export interface SignalingHandlers {
  onOpen?: () => void;
  onEnvelope?: (env: ServerEnvelope) => void;
  /** Called once when the socket closes for any reason. */
  onClose?: (event: CloseEvent) => void;
  /** Low-level transport errors; for protocol-level failures listen for
   *  ``pair_failed`` on ``onEnvelope`` instead. */
  onError?: (event: Event) => void;
}

export interface SignalingClient {
  send(envelope: ClientEnvelope): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

/** Open a signaling socket. The caller supplies handlers up front so
 *  no events are missed between construction and the first message.
 *
 *  Sends issued before the socket has finished its handshake are
 *  queued and flushed on ``open``. The receiver factory in
 *  ``PairSession`` exercises this path — it ships ``redeem`` as the
 *  very first frame, synchronously, immediately after the ``new
 *  WebSocket()`` returns, while the WS is still in CONNECTING state.
 *  Calling ``ws.send`` in that window throws ``InvalidStateError``
 *  per the spec, so the queue is load-bearing for the receiver flow. */
export function openPairSignaling(
  apiWsBaseUrl: string,
  connect: ConnectOptions,
  handlers: SignalingHandlers = {},
): SignalingClient {
  const url = buildUrl(apiWsBaseUrl, connect);
  const ws = new WebSocket(url);
  const pending: ClientEnvelope[] = [];

  ws.addEventListener("open", () => {
    while (pending.length > 0) {
      const envelope = pending.shift();
      if (envelope !== undefined) {
        ws.send(JSON.stringify(envelope));
      }
    }
    handlers.onOpen?.();
  });
  ws.addEventListener("error", (e) => handlers.onError?.(e));
  ws.addEventListener("close", (e) => handlers.onClose?.(e));
  ws.addEventListener("message", (e) => {
    const raw = typeof e.data === "string" ? e.data : null;
    if (raw === null) return; // binary frames not in our protocol
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isServerEnvelope(parsed)) return;
    handlers.onEnvelope?.(parsed);
  });

  return {
    send(envelope: ClientEnvelope): void {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(envelope));
      } else if (ws.readyState === WebSocket.CONNECTING) {
        pending.push(envelope);
      }
      // CLOSING / CLOSED: drop the frame; the session's close
      // handlers surface the failure to the page.
    },
    close(code?: number, reason?: string): void {
      ws.close(code, reason);
    },
    get readyState() {
      return ws.readyState;
    },
  };
}

function buildUrl(apiWsBaseUrl: string, connect: ConnectOptions): string {
  if (connect.role === "sender") {
    const params = new URLSearchParams({
      pin: connect.pin,
      sender_token: connect.senderToken,
    });
    return `${apiWsBaseUrl}/ws/pair?${params.toString()}`;
  }
  return `${apiWsBaseUrl}/ws/pair`;
}

function isServerEnvelope(value: unknown): value is ServerEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const op = (value as { op?: unknown }).op;
  if (typeof op !== "string") return false;
  return (
    op === "paired" ||
    op === "receiver_connected" ||
    op === "pair_failed" ||
    op === "signal"
  );
}
