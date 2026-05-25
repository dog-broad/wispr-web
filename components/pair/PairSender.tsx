"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { createPair } from "@/lib/api/pair";
import type { CreatePairResponse } from "@/lib/api/pair";

// Live in one of these states at a time.
type Phase =
  | { kind: "loading" }
  | { kind: "waiting"; pair: CreatePairResponse; remainingSeconds: number }
  | { kind: "expired"; pair: CreatePairResponse }
  | { kind: "failed"; reason: string };

const TICK_INTERVAL_MS = 1000;

export function PairSender() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const tickRef = useRef<number | null>(null);

  const issuePair = useCallback(async (controller: AbortController) => {
    setPhase({ kind: "loading" });
    try {
      const pair = await createPair({ signal: controller.signal });
      const remaining = remainingSecondsFrom(pair.expiresAt);
      if (remaining <= 0) {
        setPhase({ kind: "expired", pair });
      } else {
        setPhase({ kind: "waiting", pair, remainingSeconds: remaining });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const reason = err instanceof Error ? err.message : String(err);
      setPhase({ kind: "failed", reason });
    }
  }, []);

  // Issue on mount; abort if the component unmounts before the request
  // completes so a late response doesn't stomp a fresher state.
  useEffect(() => {
    const controller = new AbortController();
    void issuePair(controller);
    return () => controller.abort();
  }, [issuePair]);

  // Drive the per-second countdown while the pair is waiting. The tick
  // recomputes remaining from the absolute expiresAt rather than
  // decrementing a counter, so a tab that loses background ticks
  // converges to the correct value when it foregrounds again.
  useEffect(() => {
    if (phase.kind !== "waiting") {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    const handle = window.setInterval(() => {
      setPhase((current) => {
        if (current.kind !== "waiting") return current;
        const remaining = remainingSecondsFrom(current.pair.expiresAt);
        if (remaining <= 0) {
          return { kind: "expired", pair: current.pair };
        }
        return { ...current, remainingSeconds: remaining };
      });
    }, TICK_INTERVAL_MS);
    tickRef.current = handle;
    return () => {
      window.clearInterval(handle);
      tickRef.current = null;
    };
  }, [phase.kind]);

  const newPin = useCallback(() => {
    const controller = new AbortController();
    void issuePair(controller);
  }, [issuePair]);

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot state="pairing" size={3} />
      </div>

      <PixelCard variant="lifted" accent="marigold">
        <div className="flex flex-col items-center gap-6 py-2 md:py-4">
          <PinDisplay phase={phase} />
          <Countdown phase={phase} />
          <Action phase={phase} onNewPin={newPin} />
          <Helper phase={phase} />
        </div>
      </PixelCard>
    </section>
  );
}

function PinDisplay({ phase }: { phase: Phase }) {
  if (phase.kind === "loading") {
    return <PlaceholderPin label="——" />;
  }
  if (phase.kind === "failed") {
    return <PlaceholderPin label="!!" />;
  }
  const pin = phase.kind === "waiting" ? phase.pair.pin : phase.pair.pin;
  const muted = phase.kind === "expired";
  return (
    <div
      className={
        "flex items-center justify-center gap-2 font-[var(--font-mono)] tabular-nums " +
        (muted ? "opacity-40" : "")
      }
      aria-label={`Pair PIN ${pin.split("").join(" ")}`}
    >
      {pin.split("").map((digit, idx) => (
        <PinDigit key={idx} value={digit} />
      ))}
    </div>
  );
}

function PinDigit({ value }: { value: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-20 w-14 items-center justify-center border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] font-[var(--font-mono)] text-[56px] leading-none md:h-28 md:w-20 md:text-[80px]"
    >
      {value}
    </span>
  );
}

function PlaceholderPin({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 opacity-50">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="inline-flex h-20 w-14 items-center justify-center border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] font-[var(--font-mono)] text-[40px] md:h-28 md:w-20 md:text-[56px]"
        >
          {label[i] ?? "·"}
        </span>
      ))}
    </div>
  );
}

function Countdown({ phase }: { phase: Phase }) {
  if (phase.kind === "loading") {
    return (
      <p className="font-[var(--font-body)] text-[14px] opacity-70">
        Issuing PIN…
      </p>
    );
  }
  if (phase.kind === "waiting") {
    return (
      <p className="font-[var(--font-body)] text-[14px] opacity-80">
        expires in{" "}
        <span className="num font-[var(--font-mono)] text-[18px]">
          {phase.remainingSeconds}s
        </span>
      </p>
    );
  }
  if (phase.kind === "expired") {
    return (
      <p className="font-[var(--font-body)] text-[14px] opacity-80">
        <span className="text-[var(--color-pink)]">PIN expired.</span> Get a new
        one to keep pairing.
      </p>
    );
  }
  return (
    <p className="font-[var(--font-body)] text-[14px]">
      <span className="font-semibold text-[var(--color-pink)]">
        Couldn&apos;t issue a PIN.
      </span>{" "}
      <span className="num opacity-90">{phase.reason}</span>
    </p>
  );
}

function Action({ phase, onNewPin }: { phase: Phase; onNewPin: () => void }) {
  const busy = phase.kind === "loading";
  return (
    <PixelButton
      variant={phase.kind === "expired" ? "primary" : "outline"}
      size="md"
      leading={<PixelIcon name="reload" size={16} />}
      disabled={busy}
      onClick={onNewPin}
    >
      {busy ? "issuing…" : "Get a new PIN"}
    </PixelButton>
  );
}

function Helper({ phase }: { phase: Phase }) {
  return (
    <p className="flex items-center gap-2 text-center font-[var(--font-body)] text-[14px] opacity-70">
      <span className="md:hidden">
        <WispMascot state="pairing" size={2} animate={false} />
      </span>
      <span>
        {phase.kind === "expired"
          ? "PINs are short-lived on purpose — they only live until someone joins."
          : "On the other device, open Wispr and enter this PIN. Pair stays peer-to-peer; nothing is saved."}
      </span>
    </p>
  );
}

function remainingSecondsFrom(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
}
