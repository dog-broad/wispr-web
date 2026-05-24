"use client";

import { useState, type ReactNode } from "react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { WispMascot, type WispState } from "@/components/pixel/WispMascot";
import { CheckIcon, CopyIcon, SparkleIcon } from "@/components/pixel/icons";

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
          <SparkleIcon size={12} />
          working
        </>
      }
      heading="Decrypting…"
      subhead="Your browser is unlocking the message. Nothing leaves this tab."
    />
  );
}

// ----- OK (decrypted content) ----------------------------------------

export function OkCard({ text }: { text: string }) {
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
          <CheckIcon size={12} />
          decrypted
        </>
      }
      heading="Something for you."
      body={
        <div className="border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] p-4">
          <pre className="whitespace-pre-wrap break-words font-[var(--font-mono)] text-[16px] leading-[1.5]">
            {text}
          </pre>
        </div>
      }
      actions={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <PixelButton
              variant="primary"
              size="md"
              leading={<CopyIcon size={16} />}
              onClick={copy}
            >
              {copied ? "Copied" : "Copy"}
            </PixelButton>
          </div>
          <p className="font-[var(--font-body)] text-[14px] opacity-70">
            Self-destructs when you leave this page.
          </p>
        </div>
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

const GONE_COPY: Record<"expired" | "burned" | "taken_down", { heading: string; sub: string; badge: string }> = {
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
};

export function GoneCard({ reason }: { reason: "expired" | "burned" | "taken_down" }) {
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
