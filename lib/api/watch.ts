// Typed client for /ws/snippet/{id}/watch.
//
// The server pushes three event kinds: an initial snapshot, a per-
// read tick, and a terminal gone event. The client only needs to wire
// callbacks and call close() when it's done — there's no protocol
// message the client must send.

import { env } from "@/lib/env";

export type GoneReason = "expired" | "burned" | "taken_down";

export interface SnapshotEvent {
  op: "snapshot";
  read_count: number;
  max_reads: number | null;
  expires_at: string | null;
  taken_down: boolean;
  gone_reason?: GoneReason;
}

export interface ReadEvent {
  op: "read";
  read_count: number;
  at: string;
}

export interface GoneEvent {
  op: "gone";
  reason: GoneReason;
}

export type WatchEvent = SnapshotEvent | ReadEvent | GoneEvent;

export interface WatchHandlers {
  onOpen?: () => void;
  onEvent?: (event: WatchEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface WatchClient {
  close(): void;
  readonly readyState: number;
}

export function openWatch(snippetId: string, handlers: WatchHandlers): WatchClient {
  const ws = new WebSocket(
    `${env.apiWsBaseUrl}/ws/snippet/${encodeURIComponent(snippetId)}/watch`,
  );

  ws.addEventListener("open", () => handlers.onOpen?.());
  ws.addEventListener("error", (event) => handlers.onError?.(event));
  ws.addEventListener("close", (event) => handlers.onClose?.(event));
  ws.addEventListener("message", (event) => {
    const raw = typeof event.data === "string" ? event.data : null;
    if (raw === null) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const watchEvent = parseWatchEvent(parsed);
    if (watchEvent !== null) handlers.onEvent?.(watchEvent);
  });

  return {
    close() {
      ws.close();
    },
    get readyState() {
      return ws.readyState;
    },
  };
}

function parseWatchEvent(value: unknown): WatchEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.op === "snapshot" && typeof v.read_count === "number") {
    const event: SnapshotEvent = {
      op: "snapshot",
      read_count: v.read_count,
      max_reads: typeof v.max_reads === "number" ? v.max_reads : null,
      expires_at: typeof v.expires_at === "string" ? v.expires_at : null,
      taken_down: Boolean(v.taken_down),
    };
    if (isGoneReason(v.gone_reason)) event.gone_reason = v.gone_reason;
    return event;
  }
  if (v.op === "read" && typeof v.read_count === "number" && typeof v.at === "string") {
    return { op: "read", read_count: v.read_count, at: v.at };
  }
  if (v.op === "gone" && isGoneReason(v.reason)) {
    return { op: "gone", reason: v.reason };
  }
  return null;
}

function isGoneReason(value: unknown): value is GoneReason {
  return value === "expired" || value === "burned" || value === "taken_down";
}
