// Hook shared by /pair (sender) and /r (receiver) for the channel-
// open phase: owns the EncryptedChannel, the transcript state, and
// the send helpers. The two pages keep their own session lifecycles:
// they call ``attach`` from inside ``onConnected`` and ``detach``
// in cleanup.

"use client";

import { useCallback, useRef, useState } from "react";
import {
  EncryptedChannel,
  FILE_CHUNK_BYTES,
  MAX_INLINE_FILE_BYTES,
  decodeChunkData,
  type FileMetaFrame,
} from "@/lib/pair/channel";
import type { PairSession } from "@/lib/pair/session";
import type { ExchangeMessage, FileMessage } from "./ExchangeLog";

// Monotonic counter for React keys. The wire format doesn't ship a
// stable id (sender and receiver number their own messages
// independently). These ids are local-only and lossless on reload.
let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `m${messageCounter}`;
}

// Per-file reassembly state on the receiver. Held in a ref because
// chunk writes don't drive React renders directly: only the
// progress / completion updates to the transcript do.
interface InboundFile {
  meta: FileMetaFrame;
  buffer: Uint8Array;
  receivedBytes: number;
}

export interface UsePairExchange {
  transcript: ExchangeMessage[];
  /** Wire the channel up to a connected ``PairSession``. */
  attach: (session: PairSession, sessionKey: CryptoKey) => void;
  /** Drop the channel reference and clear the incoming handler. */
  detach: () => void;
  /** Clear the transcript. Used when issuing a new PIN so the user
   *  doesn't see ghost messages from a previous pair. */
  resetTranscript: () => void;
  /** Send a text message. No-op if no channel is attached. */
  sendText: (text: string) => Promise<void>;
  /** Send a file. Rejects if the file exceeds ``MAX_INLINE_FILE_BYTES``
   *  or no channel is attached. */
  sendFile: (file: File) => Promise<void>;
}

export function usePairExchange(): UsePairExchange {
  const [transcript, setTranscript] = useState<ExchangeMessage[]>([]);
  const channelRef = useRef<EncryptedChannel | null>(null);
  const inboundRef = useRef<Map<string, InboundFile>>(new Map());

  const attach = useCallback((session: PairSession, sessionKey: CryptoKey) => {
    // Defensive: tear down any prior channel before re-attaching so we
    // don't leave dangling handlers if a caller skips ``detach``.
    channelRef.current?.close();
    inboundRef.current = new Map();
    const channel = new EncryptedChannel(session, sessionKey);
    channel.setOnIncoming((frame) => {
      if (frame.type === "text") {
        setTranscript((prev) => [
          ...prev,
          { kind: "text", id: nextMessageId(), origin: "them", body: frame.body, at: new Date() },
        ]);
        return;
      }
      if (frame.type === "file_meta") {
        if (frame.size > MAX_INLINE_FILE_BYTES) {
          // Sender shouldn't have offered this; drop the announcement.
          return;
        }
        inboundRef.current.set(frame.id, {
          meta: frame,
          buffer: new Uint8Array(frame.size),
          receivedBytes: 0,
        });
        setTranscript((prev) => [
          ...prev,
          {
            kind: "file",
            id: nextMessageId(),
            transferId: frame.id,
            origin: "them",
            name: frame.name,
            mime: frame.mime,
            size: frame.size,
            status: "transferring",
            bytesTransferred: 0,
            at: new Date(),
          },
        ]);
        return;
      }
      if (frame.type === "file_chunk") {
        const xfer = inboundRef.current.get(frame.id);
        if (!xfer) return;
        const bytes = decodeChunkData(frame);
        const offset = frame.index * FILE_CHUNK_BYTES;
        // Guard against an oversized chunk that would overrun the
        // pre-allocated buffer: drop the frame instead.
        if (offset + bytes.byteLength > xfer.buffer.byteLength) return;
        xfer.buffer.set(bytes, offset);
        xfer.receivedBytes += bytes.byteLength;
        const isComplete = xfer.receivedBytes >= xfer.meta.size;
        const blob = isComplete
          ? new Blob([xfer.buffer], { type: xfer.meta.mime })
          : null;
        if (isComplete) {
          inboundRef.current.delete(frame.id);
        }
        setTranscript((prev) =>
          prev.map((m) =>
            m.kind === "file" && m.transferId === frame.id
              ? {
                  ...m,
                  bytesTransferred: xfer.receivedBytes,
                  ...(isComplete && blob !== null
                    ? { status: "complete" as const, blob }
                    : {}),
                }
              : m,
          ),
        );
      }
    });
    channelRef.current = channel;
  }, []);

  const detach = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
    inboundRef.current = new Map();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  const sendText = useCallback(async (text: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.sendText(text);
    setTranscript((prev) => [
      ...prev,
      { kind: "text", id: nextMessageId(), origin: "me", body: text, at: new Date() },
    ]);
  }, []);

  const sendFile = useCallback(async (file: File) => {
    const channel = channelRef.current;
    if (!channel) throw new Error("file send: no channel attached");
    if (file.size > MAX_INLINE_FILE_BYTES) {
      throw new Error(
        `file too large: ${file.size} bytes, max ${MAX_INLINE_FILE_BYTES}`,
      );
    }
    const transferId = `xfer-${nextMessageId()}`;
    const messageId = nextMessageId();

    // Push a placeholder into the transcript so the sender sees the
    // upload starting before chunking begins.
    const placeholder: FileMessage = {
      kind: "file",
      id: messageId,
      transferId,
      origin: "me",
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      status: "transferring",
      bytesTransferred: 0,
      at: new Date(),
    };
    setTranscript((prev) => [...prev, placeholder]);

    try {
      await channel.sendFileMeta({
        id: transferId,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
      });

      const bytes = new Uint8Array(await file.arrayBuffer());
      let offset = 0;
      let index = 0;
      while (offset < bytes.byteLength) {
        const end = Math.min(offset + FILE_CHUNK_BYTES, bytes.byteLength);
        const slice = bytes.subarray(offset, end);
        await channel.sendFileChunk(transferId, index, slice);
        offset = end;
        index += 1;
        const transferred = offset;
        setTranscript((prev) =>
          prev.map((m) =>
            m.kind === "file" && m.id === messageId
              ? { ...m, bytesTransferred: transferred }
              : m,
          ),
        );
      }

      // Mark complete locally + attach a Blob so the sender can re-
      // download what they sent (handy mid-session sanity check).
      const blob = new Blob([bytes], { type: placeholder.mime });
      setTranscript((prev) =>
        prev.map((m) =>
          m.kind === "file" && m.id === messageId
            ? { ...m, status: "complete", blob, bytesTransferred: file.size }
            : m,
        ),
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setTranscript((prev) =>
        prev.map((m) =>
          m.kind === "file" && m.id === messageId
            ? { ...m, status: "failed", error: reason }
            : m,
        ),
      );
      throw err;
    }
  }, []);

  return { transcript, attach, detach, resetTranscript, sendText, sendFile };
}
