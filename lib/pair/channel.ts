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

import { base64Decode, base64Encode, packEnvelope, unpackEnvelope } from "@/lib/crypto/encoding";
import type { MessageHandler, PairSession } from "./session";

const IV_BYTES = 12;
const AES_TAG_BYTES = 16;

// Caps and chunk size for the file path. Per PROJECT.md §10 M2: files
// are inline-only up to 256 KiB; R2-backed larger uploads land in M3.
// 16 KiB chunks keep each encrypted frame well under the cross-browser
// RTC data-channel message ceiling (~64 KiB worst case) even after
// base64 inflation (~22 KiB per chunk on the wire).
export const MAX_INLINE_FILE_BYTES = 256 * 1024;
export const FILE_CHUNK_BYTES = 16 * 1024;

export interface TextFrame {
  type: "text";
  body: string;
}

export interface FileMetaFrame {
  type: "file_meta";
  /** Sender-issued id linking this meta to its chunks. Not a security
   *  identifier, just a routing key for the receiver-side reassembler. */
  id: string;
  name: string;
  /** MIME from the sender's File object; trusted (we're ZK so we
   *  don't moderate content) but used only to drive image previews. */
  mime: string;
  size: number;
}

export interface FileChunkFrame {
  type: "file_chunk";
  id: string;
  /** Zero-based chunk index. Data channels are ordered so this is
   *  monotonic in practice, but the receiver writes by offset so
   *  reordering would still reassemble correctly. */
  index: number;
  /** Standard base64 of the chunk bytes. ~33% inflation, accepted for
   *  the 256 KiB-cap M2 scope; binary frames are an M3 optimisation. */
  data: string;
}

export type IncomingFrame = TextFrame | FileMetaFrame | FileChunkFrame;

async function encryptFrame(sessionKey: CryptoKey, frame: IncomingFrame): Promise<Uint8Array> {
  const plaintext = new TextEncoder().encode(JSON.stringify(frame));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sessionKey, plaintext),
  );
  return packEnvelope(iv, ct);
}

/** Encrypt a text frame to wire bytes. Exported separately from the
 *  channel class so tests can drive the codec without a live session. */
export async function encryptText(sessionKey: CryptoKey, text: string): Promise<Uint8Array> {
  return encryptFrame(sessionKey, { type: "text", body: text });
}

/** Encrypt a file-meta frame announcing an upcoming transfer. */
export async function encryptFileMeta(
  sessionKey: CryptoKey,
  meta: Omit<FileMetaFrame, "type">,
): Promise<Uint8Array> {
  return encryptFrame(sessionKey, { type: "file_meta", ...meta });
}

/** Encrypt one chunk of file content. ``chunkBytes`` is base64-
 *  encoded into the JSON envelope before AES-GCM applies. */
export async function encryptFileChunk(
  sessionKey: CryptoKey,
  id: string,
  index: number,
  chunkBytes: Uint8Array,
): Promise<Uint8Array> {
  return encryptFrame(sessionKey, {
    type: "file_chunk",
    id,
    index,
    data: base64Encode(chunkBytes),
  });
}

/** Decode a received chunk's base64 ``data`` back to raw bytes. */
export function decodeChunkData(frame: FileChunkFrame): Uint8Array {
  return base64Decode(frame.data);
}

/** Decrypt and parse a wire frame, or return ``null`` if the frame is
 *  malformed, tampered, or doesn't match a known variant. The receiver
 *  silently drops on failure rather than tearing down the channel. The
 *  auth tag check makes accidental delivery of garbage benign. */
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
    // Auth tag mismatch: drop.
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
  if (
    v.type === "file_meta" &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.mime === "string" &&
    typeof v.size === "number" &&
    Number.isFinite(v.size) &&
    v.size >= 0
  ) {
    return {
      type: "file_meta",
      id: v.id,
      name: v.name,
      mime: v.mime,
      size: v.size,
    };
  }
  if (
    v.type === "file_chunk" &&
    typeof v.id === "string" &&
    typeof v.index === "number" &&
    Number.isInteger(v.index) &&
    v.index >= 0 &&
    typeof v.data === "string"
  ) {
    return {
      type: "file_chunk",
      id: v.id,
      index: v.index,
      data: v.data,
    };
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
    this.dispatch(frame);
  }

  /** Announce an upcoming file transfer. Must be sent before any
   *  ``sendFileChunk`` call so the receiver can size its buffer. */
  async sendFileMeta(meta: Omit<FileMetaFrame, "type">): Promise<void> {
    const frame = await encryptFileMeta(this.sessionKey, meta);
    this.dispatch(frame);
  }

  /** Send one chunk of file content. The channel doesn't track per-
   *  file state. The caller (the sendFile helper in ``usePairExchange``)
   *  walks the file and calls this per chunk in order. */
  async sendFileChunk(id: string, index: number, chunkBytes: Uint8Array): Promise<void> {
    const frame = await encryptFileChunk(this.sessionKey, id, index, chunkBytes);
    this.dispatch(frame);
  }

  private dispatch(frame: Uint8Array): void {
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
