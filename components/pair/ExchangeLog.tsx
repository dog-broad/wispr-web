"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, ReactNode } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelTextarea } from "@/components/pixel/PixelInput";
import { cn } from "@/lib/cn";
import { MAX_INLINE_FILE_BYTES } from "@/lib/pair/channel";

// Transcript items. Text and file messages share an id + origin + at
// shape; everything else is variant-specific.
export interface TextMessage {
  kind: "text";
  id: string;
  origin: "me" | "them";
  body: string;
  at: Date;
}

export interface FileMessage {
  kind: "file";
  id: string;
  /** Wire-level transfer id linking this message to file_meta /
   *  file_chunk frames. Distinct from ``id`` (which is the React key). */
  transferId: string;
  origin: "me" | "them";
  name: string;
  mime: string;
  size: number;
  status: "transferring" | "complete" | "failed";
  bytesTransferred: number;
  blob?: Blob;
  error?: string;
  at: Date;
}

export type ExchangeMessage = TextMessage | FileMessage;

export interface ExchangeLogProps {
  messages: ExchangeMessage[];
  onSend: (text: string) => void | Promise<void>;
  onAttach: (file: File) => void | Promise<void>;
  /** Disables both the textarea and the attach button. */
  disabled?: boolean;
}

export function ExchangeLog({
  messages,
  onSend,
  onAttach,
  disabled = false,
}: ExchangeLogProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const onFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Always reset the input so the same file can be re-selected
    // after a failed attempt.
    event.target.value = "";
    if (!file) return;
    setAttachError(null);
    if (file.size > MAX_INLINE_FILE_BYTES) {
      setAttachError(
        `file too large — max ${formatBytes(MAX_INLINE_FILE_BYTES)} this milestone.`,
      );
      return;
    }
    try {
      await onAttach(file);
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : String(err));
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
            {messages.map((msg) =>
              msg.kind === "text" ? (
                <TextBubble key={msg.id} message={msg} />
              ) : (
                <FileBubble key={msg.id} message={msg} />
              ),
            )}
          </ul>
        )}
      </div>

      {attachError !== null ? (
        <p className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-1 font-[var(--font-body)] text-[12px]">
          <span className="font-semibold text-[var(--color-pink)]">
            Couldn&apos;t attach.
          </span>{" "}
          <span className="opacity-80">{attachError}</span>
        </p>
      ) : null}

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
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFilePick}
            disabled={disabled}
          />
          <PixelButton
            variant="ghost"
            size="md"
            leading={<PixelIcon name="attachment" size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Attach a file"
          >
            attach
          </PixelButton>
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
    </div>
  );
}

function TextBubble({ message }: { message: TextMessage }) {
  return (
    <Bubble origin={message.origin} at={message.at}>
      <p className="break-words font-[var(--font-body)] text-[14px]">
        {renderText(message.body)}
      </p>
    </Bubble>
  );
}

function FileBubble({ message }: { message: FileMessage }) {
  const pct =
    message.size === 0
      ? 100
      : Math.min(100, Math.round((message.bytesTransferred / message.size) * 100));
  return (
    <Bubble origin={message.origin} at={message.at}>
      <div className="flex items-start gap-2">
        <PixelIcon name="file" size={20} />
        <div className="min-w-0 flex-1">
          <p className="break-words font-[var(--font-body)] text-[14px] font-semibold">
            {message.name}
          </p>
          <p className="num font-[var(--font-mono)] text-[12px] opacity-70">
            {formatBytes(message.size)}
            {message.status === "transferring" ? (
              <span className="ml-2 opacity-90">{pct}%</span>
            ) : null}
          </p>
        </div>
      </div>
      {message.status === "transferring" ? (
        <ProgressBar pct={pct} />
      ) : null}
      {message.status === "complete" && message.blob ? (
        <FileComplete message={message} />
      ) : null}
      {message.status === "failed" ? (
        <p className="font-[var(--font-body)] text-[12px] text-[var(--color-pink)]">
          {message.error ?? "transfer failed"}
        </p>
      ) : null}
    </Bubble>
  );
}

function FileComplete({ message }: { message: FileMessage }) {
  const url = useMemo(() => {
    if (!message.blob) return null;
    return URL.createObjectURL(message.blob);
  }, [message.blob]);
  useEffect(() => {
    return () => {
      if (url !== null) URL.revokeObjectURL(url);
    };
  }, [url]);
  if (url === null) return null;
  const isImage = message.mime.startsWith("image/");
  return (
    <div className="flex flex-col gap-2">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={message.name}
          className="pixel max-h-[240px] w-full border-[2px] border-[var(--border)] object-contain"
        />
      ) : null}
      <a
        href={url}
        download={message.name}
        className="inline-flex items-center gap-1 font-[var(--font-body)] text-[14px] text-[var(--color-pink)] underline"
      >
        <PixelIcon name="download" size={14} /> download
      </a>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full border-[1px] border-[var(--border)] bg-[var(--bg-sunk)]"
    >
      <div
        style={{ width: `${pct}%` }}
        className="h-full bg-[var(--color-marigold)] transition-all"
      />
    </div>
  );
}

function Bubble({
  origin,
  at,
  children,
}: {
  origin: "me" | "them";
  at: Date;
  children: ReactNode;
}) {
  const mine = origin === "me";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={cn(
          "inline-block max-w-[80%] border-[2px] px-3 py-2",
          mine
            ? "border-[var(--color-marigold)] bg-[var(--color-marigold)]/15"
            : "border-[var(--border)] bg-[var(--bg-lifted)]",
          "flex flex-col gap-1",
        )}
      >
        {children}
        <p className="num font-[var(--font-mono)] text-[12px] opacity-50">
          {at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

function renderText(body: string): ReactNode {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KiB`;
  return `${(kb / 1024).toFixed(1)} MiB`;
}
