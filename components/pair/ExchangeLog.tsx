"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelTextarea } from "@/components/pixel/PixelInput";
import { cn } from "@/lib/cn";

export interface ExchangeMessage {
  /** Local-only id for React keys. Not the same on both peers — each
   *  side stamps its own. */
  id: string;
  origin: "me" | "them";
  body: string;
  at: Date;
}

export interface ExchangeLogProps {
  messages: ExchangeMessage[];
  onSend: (text: string) => void | Promise<void>;
  /** Disables the compose box; used when the channel is mid-close. */
  disabled?: boolean;
}

export function ExchangeLog({ messages, onSend, disabled = false }: ExchangeLogProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Snap to bottom on every new message so the conversation feels
  // live. ``auto`` (not ``smooth``) keeps it predictable on a long
  // burst of frames.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [messages.length]);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || disabled || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft("");
    } finally {
      setSending(false);
    }
  }, [disabled, draft, onSend, sending]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Pair conversation"
        className="max-h-[400px] min-h-[200px] overflow-y-auto border-[2px] border-[var(--border)] bg-[var(--bg-sunk)] px-3 py-3"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center font-[var(--font-body)] text-[14px] opacity-50">
            Nothing yet — say hello.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <PixelTextarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type to send. cmd+enter to send."
          rows={2}
          disabled={disabled}
          aria-label="Compose message"
          className="flex-1"
        />
        <PixelButton
          variant="primary"
          size="md"
          leading={<PixelIcon name="message" size={16} />}
          onClick={() => {
            void submit();
          }}
          disabled={disabled || sending || !draft.trim()}
        >
          {sending ? "sending…" : "Send"}
        </PixelButton>
      </div>
    </div>
  );
}

function Message({ message }: { message: ExchangeMessage }) {
  const mine = message.origin === "me";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={cn(
          "inline-block max-w-[80%] border-[2px] px-3 py-2",
          mine
            ? "border-[var(--color-marigold)] bg-[var(--color-marigold)]/15"
            : "border-[var(--border)] bg-[var(--bg-lifted)]",
        )}
      >
        <p className="break-words font-[var(--font-body)] text-[14px]">
          {renderBody(message.body)}
        </p>
        <p className="num mt-1 font-[var(--font-mono)] text-[12px] opacity-50">
          {message.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </li>
  );
}

// Anchor http(s) URLs inline; keep everything else as plain text. Bare
// www-style hosts and other URL flavors aren't auto-linked — the goal
// is to recognize the common copy-pasted-URL case without false
// positives on prose that happens to contain a dot.
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

function renderBody(body: string): ReactNode {
  const parts = body.split(URL_REGEX);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-pink)] underline"
        >
          {part}
        </a>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}
