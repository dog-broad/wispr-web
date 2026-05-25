"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelPill } from "@/components/pixel/PixelPill";
import { PixelSelectPill } from "@/components/pixel/PixelSelectPill";
import { PixelTextarea } from "@/components/pixel/PixelInput";
import { WispMascot } from "@/components/pixel/WispMascot";
import {
  base64Encode,
  base64urlEncode,
  packEnvelope,
} from "@/lib/crypto/encoding";
import { env } from "@/lib/env";
import { detectLanguage } from "@/lib/highlight/detect";
import type { Language } from "@/lib/highlight/highlight";
import { detectUrl } from "@/lib/url-preview/detect";
import type { SentDetails } from "./SentState";

// SentState carries the QR renderer (qrcode.react) which is only needed
// after a successful send. Lazy-loading it keeps that dependency out of
// the initial home-page bundle so the first paint is light.
const SentState = dynamic(
  () => import("./SentState").then((m) => ({ default: m.SentState })),
  { loading: () => null, ssr: false },
);

type Status =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "posting" }
  | { kind: "sent"; details: SentDetails }
  | { kind: "failed"; reason: string };

const LIFETIME_OPTIONS = [
  { value: 600, label: "10 min" },
  { value: 3600, label: "1 hr" },
  { value: 86400, label: "24 hr" },
] as const;

// Inline-file ceiling for Link mode. PROJECT.md §10 M2: 256 KiB
// inline; R2-backed larger uploads land in M3. The API cap on
// ciphertext bytes is set with this in mind.
const MAX_INLINE_FILE_BYTES = 256 * 1024;

// Encrypted metadata is opaque to the server. The schema is a version
// tag plus optional fields the receiver uses to render — the ``lang``
// hint drives syntax highlighting; ``name`` / ``mime`` describe an
// inline file attachment.
interface MetadataPayload {
  v: 1;
  lang?: Language;
  name?: string;
  mime?: string;
}

function encodeMetadata(meta: MetadataPayload): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(meta));
}

export function Composer() {
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState<number>(600);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content-type detection runs on every keystroke. URL takes priority
  // over language because a single-URL share gets its own rich preview
  // surface on receive — code-like detection inside a URL string would
  // misclassify (URL paths happen to contain JS-ish punctuation).
  const detectedUrl = attachedFile === null ? detectUrl(text) : null;
  const detectedLanguage =
    attachedFile === null && detectedUrl === null ? detectLanguage(text) : null;

  const send = useCallback(async () => {
    if (attachedFile === null && !text.trim()) return;
    setStatus({ kind: "encrypting" });
    try {
      const crypto = await import("@/lib/crypto/client");

      const key = await crypto.generateKey();

      let contentBytes: Uint8Array;
      let metadata: MetadataPayload;
      let contentType: "text" | "code" | "url" | "file";

      if (attachedFile !== null) {
        contentBytes = new Uint8Array(await attachedFile.arrayBuffer());
        metadata = {
          v: 1,
          name: attachedFile.name,
          mime: attachedFile.type || "application/octet-stream",
        };
        contentType = "file";
      } else {
        contentBytes = new TextEncoder().encode(text);
        // Re-run detection at send time so the body reflects the final
        // textarea state regardless of any intermediate edits.
        const urlAtSend = detectUrl(text);
        const langAtSend = urlAtSend === null ? detectLanguage(text) : null;
        metadata = langAtSend === null ? { v: 1 } : { v: 1, lang: langAtSend };
        contentType =
          urlAtSend !== null ? "url" : langAtSend !== null ? "code" : "text";
      }

      const content = await crypto.encrypt(key, contentBytes);
      const meta = await crypto.encrypt(key, encodeMetadata(metadata));

      const body = {
        share_mode: "link",
        content_type: contentType,
        ciphertext: base64Encode(packEnvelope(content.iv, content.ciphertext)),
        encrypted_metadata: base64Encode(packEnvelope(meta.iv, meta.ciphertext)),
        ttl_seconds: ttlSeconds,
        max_reads: 1,
      };

      setStatus({ kind: "posting" });
      const response = await fetch(`${env.apiBaseUrl}/snippets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await safeErrorBody(response);
        throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
      }
      const { id, expires_at } = (await response.json()) as { id: string; expires_at: string };

      const keyB64Url = base64urlEncode(key);
      const url = `${window.location.origin}/s/${id}#k=${keyB64Url}`;

      // Best-effort copy. Some browsers / contexts deny clipboard writes
      // (e.g. non-secure contexts in dev); the sent state still shows
      // the URL and a manual copy button so the user is not stuck.
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }

      setStatus({
        kind: "sent",
        details: { id, url, copied, expiresAt: new Date(expires_at) },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "failed", reason });
    }
  }, [attachedFile, text, ttlSeconds]);

  function reset() {
    setText("");
    setAttachedFile(null);
    setAttachError(null);
    setTtlSeconds(600);
    setStatus({ kind: "idle" });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void send();
    }
  }

  function onFilePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be re-selected after a failed
    // attempt or after the user clears it.
    event.target.value = "";
    if (!file) return;
    setAttachError(null);
    if (file.size > MAX_INLINE_FILE_BYTES) {
      setAttachError(
        `file too large — max ${formatBytes(MAX_INLINE_FILE_BYTES)} inline; larger uploads ship in the next milestone.`,
      );
      return;
    }
    setAttachedFile(file);
  }

  function clearAttachment() {
    setAttachedFile(null);
    setAttachError(null);
  }

  if (status.kind === "sent") {
    return <SentState details={status.details} onSendAnother={reset} />;
  }

  const busy = status.kind === "encrypting" || status.kind === "posting";
  const sendDisabled = busy || (attachedFile === null && !text.trim());
  const primaryLabel = busy
    ? status.kind === "encrypting"
      ? "Encrypting…"
      : "Sending…"
    : attachedFile !== null
      ? "Send file"
      : "Get a link";

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot state="wave" size={3} />
      </div>

      <PixelCard variant="lifted" accent="pink">
        <div className="flex flex-col gap-4">
          {attachedFile === null ? (
            <PixelTextarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type or paste anything.
text — code — urls — files (up to 256 KiB)
Encrypted in your browser before it leaves."
              rows={6}
              aria-label="Content to send"
            />
          ) : (
            <FileAttachmentRow file={attachedFile} onClear={clearAttachment} />
          )}

          {attachError !== null && (
            <p className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-body)] text-[14px]">
              <span className="font-semibold text-[var(--color-pink)]">
                Couldn&apos;t attach.
              </span>{" "}
              <span className="opacity-80">{attachError}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <PixelSelectPill
              icon={<PixelIcon name="clock" size={12} />}
              label="lifetime"
              value={ttlSeconds}
              options={LIFETIME_OPTIONS}
              onChange={setTtlSeconds}
            />
            <PixelPill
              icon={<PixelIcon name="eye" size={12} />}
              label="reads"
              value="1"
              disabled
              title="Link burns after one read; multi-read PINs ship later"
            />
            <PixelPill
              icon={<PixelIcon name="lock" size={12} />}
              label="password"
              value="off"
              disabled
              title="Optional password gate ships with the next release"
            />
            {detectedUrl !== null && (
              <PixelPill
                icon={<PixelIcon name="link" size={12} />}
                label="url"
                value={detectedUrl.hostname}
                title="URL detected — receiver will see a link preview"
              />
            )}
            {detectedLanguage !== null && (
              <PixelPill
                icon={<PixelIcon name="code" size={12} />}
                label="code"
                value={detectedLanguage}
                title="Code detected — receiver will see syntax highlighting"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFilePick}
              aria-label="Attach a file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachedFile !== null || busy}
              className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-0.5 font-[var(--font-display)] text-[12px] tracking-widest uppercase text-[var(--fg)] shadow-[2px_2px_0_0_var(--border)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Attach a file (up to 256 KiB)"
            >
              <PixelIcon name="attachment" size={12} />
              attach
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PixelButton
              variant="primary"
              size="lg"
              block
              leading={
                <PixelIcon
                  name={attachedFile !== null ? "file" : "link"}
                  size={20}
                />
              }
              trailing={
                <kbd className="ml-1 inline-flex items-center gap-1 border-2 border-current px-1.5 py-0.5 font-[var(--font-mono)] text-[12px]">
                  <PixelIcon name="command" size={12} />↵
                </kbd>
              }
              onClick={send}
              disabled={sendDisabled}
            >
              {primaryLabel}
            </PixelButton>
            <PixelButton
              variant="secondary"
              size="lg"
              block
              leading={<PixelIcon name="lock" size={20} />}
              disabled
              title="Sign in to share by PIN"
            >
              Get a PIN
            </PixelButton>
          </div>

          {status.kind === "failed" ? (
            <p className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-body)] text-[14px]">
              <span className="font-semibold text-[var(--color-pink)]">Could not send.</span>{" "}
              <span className="num opacity-90">{status.reason}</span>
            </p>
          ) : (
            <p className="flex items-center gap-2 font-[var(--font-body)] text-[14px] opacity-70">
              <span className="md:hidden">
                <WispMascot state="linking" size={2} animate={false} />
              </span>
              <span>
                Only the link-holder can read it. Sign in to share by PIN —
                easier for groups.
              </span>
            </p>
          )}
        </div>
      </PixelCard>
    </section>
  );
}

function FileAttachmentRow({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] px-4 py-3">
      <PixelIcon name="file" size={24} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-[var(--font-body)] text-[16px] font-semibold">
          {file.name}
        </p>
        <p className="num font-[var(--font-mono)] text-[12px] opacity-70">
          {formatBytes(file.size)}
          {file.type && <> · {file.type}</>}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove attachment"
        className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 font-[var(--font-display)] text-[12px] tracking-widest uppercase text-[var(--fg)] shadow-[2px_2px_0_0_var(--border)]"
      >
        <PixelIcon name="close" size={12} />
        clear
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KiB`;
  return `${(kb / 1024).toFixed(1)} MiB`;
}

async function safeErrorBody(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    return null;
  } catch {
    return null;
  }
}
