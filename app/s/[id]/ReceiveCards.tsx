"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { WispMascot, type WispState } from "@/components/pixel/WispMascot";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { tokenize, type Language, type TokenKind } from "@/lib/highlight/highlight";
import { fetchOgPreview, type OgPreview } from "@/lib/url-preview/og";

// ----- Shared shell ---------------------------------------------------

interface ShellProps {
  accent: "moss" | "pink" | "purple" | "marigold";
  mascot: WispState;
  badge: ReactNode;
  heading: string;
  subhead?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
}

function Shell({ accent, mascot, badge, heading, subhead, body, actions }: ShellProps) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot state={mascot} size={3} />
      </div>
      <PixelCard variant="lifted" accent={accent}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <PixelBadge tone={accent === "pink" ? "error" : accent === "marigold" ? "warn" : "success"}>
              {badge}
            </PixelBadge>
            <span className="ml-auto md:hidden">
              <WispMascot state={mascot} size={2} />
            </span>
          </div>

          <h1 className="font-[var(--font-display)] text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
            {heading}
          </h1>

          {subhead && (
            <p className="w-full font-[var(--font-body)] text-[16px] leading-[1.5] opacity-90 md:max-w-[58ch]">
              {subhead}
            </p>
          )}

          {body}

          {actions}
        </div>
      </PixelCard>
    </section>
  );
}

// ----- Decrypting (loading) ------------------------------------------

export function DecryptingCard() {
  return (
    <Shell
      accent="purple"
      mascot="idle"
      badge={
        <>
          <PixelIcon name="zap" size={12} />
          working
        </>
      }
      heading="Decrypting…"
      subhead="Your browser is unlocking the message. Nothing leaves this tab."
    />
  );
}

// ----- OK (decrypted content) ----------------------------------------

export function OkCard({
  text,
  lang,
  extraAction,
}: {
  text: string;
  lang: Language | null;
  // Optional trailing action rendered in the button row — PIN receives pass a
  // report control here; Link receives leave it undefined.
  extraAction?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Shell
      accent="moss"
      mascot="success"
      badge={
        <>
          <PixelIcon name="check" size={12} />
          {lang === null ? "decrypted" : `decrypted · ${lang}`}
        </>
      }
      heading="Something for you."
      body={
        <div className="border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] p-4">
          <pre className="whitespace-pre-wrap break-words font-[var(--font-mono)] text-[16px] leading-[1.5]">
            {lang === null ? text : <HighlightedCode lang={lang} text={text} />}
          </pre>
        </div>
      }
      actions={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <PixelButton
              variant="primary"
              size="md"
              leading={<PixelIcon name="copy" size={16} />}
              onClick={copy}
            >
              {copied ? "Copied" : "Copy"}
            </PixelButton>
            {extraAction}
          </div>
          <p className="font-[var(--font-body)] text-[14px] opacity-70">
            Self-destructs when you leave this page.
          </p>
        </div>
      }
    />
  );
}

// Color classes for the three highlighted token kinds, per the
// project's aesthetic rules (purple keywords, marigold strings, moss
// comments). Plain tokens inherit the surrounding text color.
const TOKEN_CLASSES: Record<TokenKind, string> = {
  keyword: "text-[var(--color-purple)]",
  string: "text-[var(--color-marigold)]",
  comment: "text-[var(--color-moss)] italic",
  plain: "",
};

function HighlightedCode({ lang, text }: { lang: Language; text: string }) {
  const tokens = tokenize(lang, text);
  return (
    <>
      {tokens.map((token, idx) => {
        if (token.kind === "plain") {
          return <Fragment key={idx}>{token.text}</Fragment>;
        }
        return (
          <span key={idx} className={TOKEN_CLASSES[token.kind]}>
            {token.text}
          </span>
        );
      })}
    </>
  );
}

// ----- OK (decrypted file) -------------------------------------------

export function FileOkCard({
  blob,
  name,
  mime,
  extraAction,
}: {
  blob: Blob;
  name: string;
  mime: string;
  extraAction?: ReactNode;
}) {
  // The object URL must outlive the user's click on the download link
  // but get revoked on unmount to release the browser-side allocation.
  // useMemo so a re-render doesn't churn through new URLs.
  const url = useObjectUrl(blob);
  const isImage = mime.startsWith("image/");

  return (
    <Shell
      accent="moss"
      mascot="success"
      badge={
        <>
          <PixelIcon name="file" size={12} />
          decrypted · file
        </>
      }
      heading="A file for you."
      body={
        <div className="flex flex-col gap-3 border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] p-4">
          <div className="flex items-center gap-3">
            <PixelIcon name="file" size={24} />
            <div className="min-w-0 flex-1">
              <p className="break-words font-[var(--font-body)] text-[16px] font-semibold">
                {name}
              </p>
              <p className="num font-[var(--font-mono)] text-[12px] opacity-70">
                {formatBytes(blob.size)} · {mime}
              </p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isImage && url !== null && (
            <img
              src={url}
              alt={name}
              className="pixel max-h-[360px] w-full border-[2px] border-[var(--border)] object-contain"
            />
          )}
        </div>
      }
      actions={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {url !== null && (
              <a
                href={url}
                download={name}
                className="pixel-press inline-flex h-12 items-center gap-2 border-[3px] border-[var(--color-navy)] bg-[var(--color-pink)] px-5 font-[var(--font-body)] text-[16px] font-semibold text-[var(--color-navy)] shadow-[4px_4px_0_0_var(--color-navy)]"
              >
                <PixelIcon name="download" size={16} />
                Download
              </a>
            )}
            {extraAction}
          </div>
          <p className="font-[var(--font-body)] text-[14px] opacity-70">
            Self-destructs when you leave this page.
          </p>
        </div>
      }
    />
  );
}

function useObjectUrl(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [blob]);
  return url;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KiB`;
  return `${(kb / 1024).toFixed(1)} MiB`;
}

// ----- OK (decrypted URL) --------------------------------------------

type UrlPreviewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; preview: OgPreview }
  | { kind: "unavailable" };

export function UrlOkCard({ url, extraAction }: { url: URL; extraAction?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<UrlPreviewState>({ kind: "idle" });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setPreview({ kind: "loading" });
    (async () => {
      const result = await fetchOgPreview(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result === null) {
        setPreview({ kind: "unavailable" });
      } else {
        setPreview({ kind: "ready", preview: result });
      }
    })();
    return () => controller.abort();
  }, [url]);

  return (
    <Shell
      accent="moss"
      mascot="success"
      badge={
        <>
          <PixelIcon name="link" size={12} />
          decrypted · url
        </>
      }
      heading="A link for you."
      body={
        <div className="flex flex-col gap-3">
          <UrlPreviewBlock url={url} state={preview} />
        </div>
      }
      actions={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <PixelButton
              variant="primary"
              size="md"
              leading={<PixelIcon name="link" size={16} />}
              onClick={() => window.open(url.href, "_blank", "noopener,noreferrer")}
            >
              Open link
            </PixelButton>
            <PixelButton
              variant="ghost"
              size="md"
              leading={<PixelIcon name="copy" size={16} />}
              onClick={copy}
            >
              {copied ? "Copied" : "Copy URL"}
            </PixelButton>
            {extraAction}
          </div>
          <p className="font-[var(--font-body)] text-[14px] opacity-70">
            Self-destructs when you leave this page.
          </p>
        </div>
      }
    />
  );
}

function UrlPreviewBlock({
  url,
  state,
}: {
  url: URL;
  state: UrlPreviewState;
}) {
  const ready = state.kind === "ready" ? state.preview : null;
  return (
    <div className="flex flex-col gap-3 border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] p-4">
      <div className="flex items-center gap-2 font-[var(--font-mono)] text-[14px]">
        <PixelIcon name="link" size={14} />
        <span className="num truncate" title={url.href}>
          {url.hostname}
        </span>
      </div>

      {ready?.title && (
        <p className="font-[var(--font-display)] text-[18px] leading-[1.2]">
          {ready.title}
        </p>
      )}

      {ready?.description && (
        <p className="font-[var(--font-body)] text-[14px] opacity-90">
          {ready.description}
        </p>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      {ready?.image && (
        <img
          src={ready.image}
          alt=""
          className="pixel max-h-[240px] w-full border-[2px] border-[var(--border)] object-contain"
          onError={(event) => {
            // OG image hosts sometimes 404 or block hotlinking; drop
            // the image element instead of letting a broken-img icon
            // sit in the preview.
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      <p
        className="font-[var(--font-mono)] text-[12px] opacity-60"
        aria-live="polite"
      >
        {state.kind === "loading"
          ? "fetching preview…"
          : state.kind === "unavailable"
            ? "no preview — site didn't allow a direct fetch."
            : ready?.title || ready?.description || ready?.image
              ? null
              : "no preview — site didn't expose Open Graph metadata."}
      </p>
    </div>
  );
}

// ----- Password gate (snippet is password-protected) ----------------

export function PasswordPromptCard({
  wrongAttempts,
  rateLimited,
  verifying,
  onSubmit,
}: {
  wrongAttempts: number;
  rateLimited: boolean;
  verifying: boolean;
  onSubmit: (password: string) => void | Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const disabled = rateLimited || verifying;

  return (
    <Shell
      accent="purple"
      mascot="linking"
      badge={
        <>
          <PixelIcon name="lock" size={12} />
          password
        </>
      }
      heading="Password required."
      subhead="The sender put an extra gate on this share. Type the password they gave you out-of-band."
      body={
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled || password.length === 0) return;
            void onSubmit(password);
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            autoFocus
            disabled={disabled}
            className="border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-mono)] text-[18px] focus:outline-none focus:border-[var(--color-pink)]"
            aria-label="Snippet password"
          />
          <PixelButton
            type="submit"
            variant="primary"
            size="md"
            leading={<PixelIcon name="lock" size={16} />}
            disabled={disabled || password.length === 0}
          >
            {verifying ? "Verifying…" : "Unlock"}
          </PixelButton>
          {rateLimited && (
            <p className="font-[var(--font-body)] text-[14px] text-[var(--color-pink)]">
              Too many tries. Wait a minute and refresh the page.
            </p>
          )}
          {!rateLimited && wrongAttempts > 0 && (
            <p className="num font-[var(--font-mono)] text-[14px] text-[var(--color-pink)]">
              wrong password ({wrongAttempts} {wrongAttempts === 1 ? "try" : "tries"})
            </p>
          )}
          <p className="font-[var(--font-body)] text-[12px] opacity-70">
            Access-control only. The actual decryption key still lives in the
            URL fragment.
          </p>
        </form>
      }
    />
  );
}

// ----- Missing-key (no #k= fragment) ---------------------------------

export function MissingKeyCard() {
  return (
    <Shell
      accent="marigold"
      mascot="error"
      badge="link is incomplete"
      heading="This URL is missing the key."
      subhead={
        <>
          The piece after <code className="num">#</code> in the URL holds the
          decryption key. If you copied this link out of an app that strips
          fragments, ask the sender for the full URL.
        </>
      }
    />
  );
}

// ----- Wrong-key (decrypt failed) ------------------------------------

export function WrongKeyCard() {
  return (
    <Shell
      accent="pink"
      mascot="error"
      badge="couldn’t decrypt"
      heading="That key didn’t fit."
      subhead="The key in this URL doesn’t match the ciphertext. The link may have been altered in transit — ask the sender to share it again."
    />
  );
}

// ----- Gone (expired / burned / taken_down) --------------------------

export type GoneReason = "expired" | "burned" | "taken_down" | "disabled";

const GONE_COPY: Record<GoneReason, { heading: string; sub: string; badge: string }> = {
  expired: {
    heading: "This share has expired.",
    sub: "The sender set a lifetime on this link and it has run out. Ask them to send a fresh one.",
    badge: "expired",
  },
  burned: {
    heading: "This share has already been opened.",
    sub: "It was set to self-destruct after one read. The previous receiver has it now.",
    badge: "burned",
  },
  taken_down: {
    heading: "This share was removed.",
    sub: "The operator pulled this snippet down. Ask the sender if you need it again.",
    badge: "taken down",
  },
  disabled: {
    heading: "This PIN was disabled.",
    sub: "Too many wrong tries locked it. Ask the sender to issue a new PIN.",
    badge: "disabled",
  },
};

export function GoneCard({ reason }: { reason: GoneReason }) {
  const copy = GONE_COPY[reason];
  return (
    <Shell
      accent="marigold"
      mascot="sleeping"
      badge={copy.badge}
      heading={copy.heading}
      subhead={copy.sub}
    />
  );
}

// ----- Not found (404) -----------------------------------------------

export function NotFoundCard() {
  return (
    <Shell
      accent="pink"
      mascot="error"
      badge="no such share"
      heading="There’s no share at this URL."
      subhead="The link may have been mistyped, or it was deleted by its owner. Double-check the URL with the sender."
    />
  );
}

// ----- Network error -------------------------------------------------

export function NetworkErrorCard({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  return (
    <Shell
      accent="pink"
      mascot="error"
      badge="couldn’t reach Wispr"
      heading="The server didn’t answer."
      subhead={
        <>
          Check your connection and try again. If it keeps failing, the API
          may be down. <span className="num opacity-80">({reason})</span>
        </>
      }
      actions={
        <PixelButton variant="primary" size="md" onClick={onRetry}>
          Try again
        </PixelButton>
      }
    />
  );
}

// ----- Malformed response (server gave us something unexpected) ------

export function MalformedCard() {
  return (
    <Shell
      accent="pink"
      mascot="error"
      badge="unexpected response"
      heading="Something’s off on the server side."
      subhead="The API responded with a shape we don’t recognise. This is a Wispr bug, not yours — please tell the operator."
    />
  );
}
