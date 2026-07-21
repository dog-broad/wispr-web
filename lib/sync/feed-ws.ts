// Typed client for /ws/sync — the live Sync feed.
//
// The server pushes two event kinds: snippet.created (with the full item, so
// the feed can render it without a refetch) and snippet.deleted (just the id).
// The socket is authed by the session cookie on the upgrade; the client sends
// nothing. Unlike the one-shot /watch socket, this feed is long-lived, so it
// reconnects with capped backoff when the connection drops.

import { base64Decode } from "@/lib/crypto/encoding";
import { env } from "@/lib/env";
import type { ClipContentType, SyncItem } from "@/lib/api/sync";

export interface SyncFeedHandlers {
  onCreated?: (item: SyncItem) => void;
  onDeleted?: (id: string) => void;
  onStatus?: (status: "open" | "reconnecting" | "closed") => void;
}

export interface SyncFeedClient {
  close(): void;
}

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10_000;

export function openSyncFeed(handlers: SyncFeedHandlers): SyncFeedClient {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    if (closed) return;
    ws = new WebSocket(`${env.apiWsBaseUrl}/ws/sync`);

    ws.addEventListener("open", () => {
      attempt = 0;
      handlers.onStatus?.("open");
    });
    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      dispatch(parsed, handlers);
    });
    ws.addEventListener("close", () => {
      if (closed) return;
      handlers.onStatus?.("reconnecting");
      scheduleReconnect();
    });
    // An error is always followed by a close; let close() drive reconnect.
    ws.addEventListener("error", () => ws?.close());
  }

  function scheduleReconnect(): void {
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    attempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      handlers.onStatus?.("closed");
      ws?.close();
    },
  };
}

function dispatch(value: unknown, handlers: SyncFeedHandlers): void {
  if (typeof value !== "object" || value === null) return;
  const v = value as Record<string, unknown>;
  if (v.op === "snippet.created" && typeof v.item === "object" && v.item !== null) {
    const item = parseItem(v.item as Record<string, unknown>);
    if (item !== null) handlers.onCreated?.(item);
    return;
  }
  if (v.op === "snippet.deleted" && typeof v.id === "string") {
    handlers.onDeleted?.(v.id);
  }
}

function parseItem(raw: Record<string, unknown>): SyncItem | null {
  if (typeof raw.id !== "string") return null;
  try {
    return {
      id: raw.id,
      contentType: raw.content_type as ClipContentType,
      ciphertext: base64Decode(String(raw.ciphertext)),
      wrappedDek: base64Decode(String(raw.wrapped_dek)),
      wrappedDekIv: base64Decode(String(raw.wrapped_dek_iv)),
      encryptedMetadata: base64Decode(String(raw.encrypted_metadata)),
      sizeBytes: Number(raw.size_bytes),
      createdAt: String(raw.created_at),
    };
  } catch {
    return null;
  }
}
