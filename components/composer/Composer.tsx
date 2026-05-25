"use client";

import { useCallback, useState } from "react";
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

const METADATA_PLAINTEXT = new TextEncoder().encode(JSON.stringify({ v: 1 }));

export function Composer() {
  const [text, setText] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState<number>(600);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const send = useCallback(async () => {
    if (!text.trim()) return;
    setStatus({ kind: "encrypting" });
    try {
      const crypto = await import("@/lib/crypto/client");

      const key = await crypto.generateKey();
      const contentBytes = new TextEncoder().encode(text);

      const content = await crypto.encrypt(key, contentBytes);
      const meta = await crypto.encrypt(key, METADATA_PLAINTEXT);

      const body = {
        share_mode: "link",
        content_type: "text",
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
  }, [text, ttlSeconds]);

  function reset() {
    setText("");
    setTtlSeconds(600);
    setStatus({ kind: "idle" });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void send();
    }
  }

  if (status.kind === "sent") {
    return <SentState details={status.details} onSendAnother={reset} />;
  }

  const busy = status.kind === "encrypting" || status.kind === "posting";

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot state="wave" size={3} />
      </div>

      <PixelCard variant="lifted" accent="pink">
        <div className="flex flex-col gap-4">
          <PixelTextarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type or paste anything.
text — code — urls (up to 25 MB)
Encrypted in your browser before it leaves."
            rows={6}
            aria-label="Content to send"
          />

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
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PixelButton
              variant="primary"
              size="lg"
              block
              leading={<PixelIcon name="link" size={20} />}
              trailing={
                <kbd className="ml-1 inline-flex items-center gap-1 border-2 border-current px-1.5 py-0.5 font-[var(--font-mono)] text-[12px]">
                  <PixelIcon name="command" size={12} />↵
                </kbd>
              }
              onClick={send}
              disabled={busy || !text.trim()}
            >
              {status.kind === "encrypting"
                ? "Encrypting…"
                : status.kind === "posting"
                  ? "Sending…"
                  : "Get a link"}
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

async function safeErrorBody(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    return null;
  } catch {
    return null;
  }
}
