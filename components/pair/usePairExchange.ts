// Hook shared by /pair (sender) and /r (receiver) for the channel-
// open phase: owns the EncryptedChannel, the transcript state, and
// the send helper. The two pages keep their own session lifecycles
// — they call ``attach`` from inside ``onConnected`` and ``detach``
// in cleanup.

"use client";

import { useCallback, useRef, useState } from "react";
import { EncryptedChannel } from "@/lib/pair/channel";
import type { PairSession } from "@/lib/pair/session";
import type { ExchangeMessage } from "./ExchangeLog";

// Monotonic counter for React keys. The wire format doesn't ship a
// stable id (sender and receiver number their own messages
// independently) — these ids are local-only and lossless on reload.
let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `m${messageCounter}`;
}

export interface UsePairExchange {
  transcript: ExchangeMessage[];
  /** Wire the channel up to a connected ``PairSession``. Idempotent
   *  in the sense that ``detach`` should be called between attaches. */
  attach: (session: PairSession, sessionKey: CryptoKey) => void;
  /** Drop the channel reference and clear the incoming handler. Safe
   *  to call when nothing is attached. */
  detach: () => void;
  /** Clear the transcript. Used when issuing a new PIN so the user
   *  doesn't see ghost messages from a previous pair. */
  resetTranscript: () => void;
  /** Send a text message. No-op if no channel is attached. */
  sendText: (text: string) => Promise<void>;
}

export function usePairExchange(): UsePairExchange {
  const [transcript, setTranscript] = useState<ExchangeMessage[]>([]);
  const channelRef = useRef<EncryptedChannel | null>(null);

  const attach = useCallback((session: PairSession, sessionKey: CryptoKey) => {
    // Defensive: tear down any prior channel before re-attaching so we
    // don't leave dangling handlers if a caller skips ``detach``.
    channelRef.current?.close();
    const channel = new EncryptedChannel(session, sessionKey);
    channel.setOnIncoming((frame) => {
      if (frame.type === "text") {
        setTranscript((prev) => [
          ...prev,
          { id: nextMessageId(), origin: "them", body: frame.body, at: new Date() },
        ]);
      }
    });
    channelRef.current = channel;
  }, []);

  const detach = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
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
      { id: nextMessageId(), origin: "me", body: text, at: new Date() },
    ]);
  }, []);

  return { transcript, attach, detach, resetTranscript, sendText };
}
