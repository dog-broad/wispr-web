// Connect-state banner shared by /pair (sender) and /r (receiver).
//
// The SAS code is the optional MITM check from [D-0024-01]: both peers
// derive the same 4-char Crockford-base32 value if and only if no
// operator man-in-the-middle was inserted into signaling. Verifying it
// out-of-band (read it over voice, glance across the desk) is the
// user-facing recourse. The UX rule is "send first, verify if you
// care"; the code is shown but doesn't gate the channel.
//
// Failure rendering: ``copyForFailure`` maps every reachable wire
// reason to dedicated copy from PROJECT.md §7.6.7, so the receiver
// never falls through to a generic "something went wrong"; that's
// the explicit anti-goal in the spec.

"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { copyForFailure } from "@/lib/pair/outcomes";
import type { PairFailure } from "@/lib/pair/session";

export type ConnectBannerState =
  | { kind: "idle" }
  | { kind: "connected"; sas: string }
  | { kind: "failed"; failure: PairFailure };

export function ConnectBanner({ state }: { state: ConnectBannerState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "connected") {
    return (
      <Banner color="moss" title={<span>Connected</span>}>
        <span className="opacity-70">· code</span>{" "}
        <span
          className="num font-[var(--font-mono)] text-[20px] tracking-widest"
          aria-label={`Security code ${state.sas.split("").join(" ")}`}
        >
          {state.sas}
        </span>
        <span className="ml-auto hidden text-[12px] opacity-70 sm:inline">
          read it on the other device to confirm
        </span>
      </Banner>
    );
  }

  const copy = copyForFailure(state.failure);
  return (
    <Banner color="pink" title={<span className="font-semibold">{copy.title}</span>}>
      <span className="opacity-80">{copy.body}</span>
      {copy.countdown ? (
        <CountdownLabel
          startSeconds={state.failure.retryAfterSeconds ?? 0}
          className="ml-auto"
        />
      ) : null}
    </Banner>
  );
}

function Banner({
  color,
  title,
  children,
}: {
  color: "moss" | "pink";
  title: ReactNode;
  children: ReactNode;
}) {
  const borderClass =
    color === "moss"
      ? "border-[var(--color-moss)]"
      : "border-[var(--color-pink)]";
  const dotClass =
    color === "moss" ? "bg-[var(--color-moss)]" : "bg-[var(--color-pink)]";
  return (
    <div
      className={`flex w-full flex-wrap items-center gap-3 border-[2px] ${borderClass} bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-body)] text-[14px]`}
    >
      <span aria-hidden className={`inline-block h-3 w-3 shrink-0 ${dotClass}`} />
      {title}
      {children}
    </div>
  );
}

// Counts down once per second from a starting value. Rendered as
// "wait Ns" in VT323 so the digits stay readable at small sizes.
function CountdownLabel({
  startSeconds,
  className,
}: {
  startSeconds: number;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(Math.max(0, startSeconds));
  useEffect(() => {
    setRemaining(Math.max(0, startSeconds));
  }, [startSeconds]);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);
  if (remaining <= 0) return null;
  return (
    <span className={className}>
      <span className="opacity-60">wait </span>
      <span className="num font-[var(--font-mono)] text-[18px]">{remaining}s</span>
    </span>
  );
}
