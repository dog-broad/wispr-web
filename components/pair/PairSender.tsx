"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectBanner, type ConnectBannerState } from "@/components/pair/ConnectBanner";
import { ExchangeLog } from "@/components/pair/ExchangeLog";
import { usePairExchange } from "@/components/pair/usePairExchange";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { createPair } from "@/lib/api/pair";
import type { CreatePairResponse } from "@/lib/api/pair";
import { env } from "@/lib/env";
import { PairSession, type PairFailure, type PairPhase } from "@/lib/pair/session";

// PIN-issuance state machine. The session-connection state machine
// lives in ``SessionState`` and overlays this — the PIN may have been
// issued and counted down even while the encrypted channel is up.
type IssueState =
  | { kind: "loading" }
  | { kind: "waiting"; pair: CreatePairResponse; remainingSeconds: number }
  | { kind: "expired"; pair: CreatePairResponse }
  | { kind: "failed"; reason: string };

type SessionState =
  | { kind: "idle" }
  | { kind: "connecting"; phase: PairPhase }
  | { kind: "connected"; sas: string }
  | { kind: "failed"; failure: PairFailure };

const TICK_INTERVAL_MS = 1000;

export function PairSender() {
  const [issue, setIssue] = useState<IssueState>({ kind: "loading" });
  const [session, setSession] = useState<SessionState>({ kind: "idle" });
  const tickRef = useRef<number | null>(null);
  const sessionRef = useRef<PairSession | null>(null);
  // Destructure the hook return so the effect below can depend on the
  // stable useCallback references rather than the wrapper object —
  // which is a fresh literal every render and would otherwise re-fire
  // the effect on every countdown tick, churning a new
  // RTCPeerConnection each second until Chrome's per-tab cap hits.
  const {
    transcript,
    attach,
    detach,
    resetTranscript,
    sendText,
    sendFile,
  } = usePairExchange();

  const issuePair = useCallback(async (controller: AbortController) => {
    setIssue({ kind: "loading" });
    try {
      const pair = await createPair({ signal: controller.signal });
      const remaining = remainingSecondsFrom(pair.expiresAt);
      if (remaining <= 0) {
        setIssue({ kind: "expired", pair });
      } else {
        setIssue({ kind: "waiting", pair, remainingSeconds: remaining });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const reason = err instanceof Error ? err.message : String(err);
      setIssue({ kind: "failed", reason });
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
    if (issue.kind !== "waiting") {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    const handle = window.setInterval(() => {
      setIssue((current) => {
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
  }, [issue.kind]);

  // Spawn one PairSession per issued PIN. The dep is the pair OBJECT
  // (stable until a new PIN is issued), not the whole ``issue`` state
  // (which gets a fresh top-level reference every countdown tick).
  // ``attach`` / ``detach`` are useCallback-stable inside the hook,
  // so listing them in the deps doesn't cause re-fires.
  const currentPair = issue.kind === "waiting" ? issue.pair : null;
  useEffect(() => {
    if (currentPair === null) return;
    const { pin, senderToken } = currentPair;
    setSession({ kind: "connecting", phase: "opening_signaling" });
    const s = PairSession.createSender(
      env.apiBaseUrl,
      { pin, senderToken },
      {
        onPhase: (phase) => {
          setSession((current) => {
            if (current.kind === "connected") return current;
            if (current.kind === "failed") return current;
            return { kind: "connecting", phase };
          });
        },
        onConnected: ({ sas, sessionKey }) => {
          setSession({ kind: "connected", sas });
          attach(s, sessionKey);
        },
        onFailed: (failure) => {
          setSession({ kind: "failed", failure });
        },
      },
    );
    sessionRef.current = s;
    return () => {
      detach();
      s.close("issue_changed");
      sessionRef.current = null;
    };
  }, [currentPair, attach, detach]);

  const newPin = useCallback(() => {
    sessionRef.current?.close("new_pin_requested");
    setSession({ kind: "idle" });
    resetTranscript();
    const controller = new AbortController();
    void issuePair(controller);
  }, [issuePair, resetTranscript]);

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot
          state={session.kind === "connected" ? "success" : "pairing"}
          size={3}
        />
      </div>

      <PixelCard variant="lifted" accent="marigold">
        <div className="flex flex-col gap-4 py-2 md:py-4">
          <ConnectBanner state={bannerFromSession(session)} />

          {showExchangeSurface(session) ? (
            <>
              <ExchangeLog
                messages={transcript}
                onSend={sendText}
                onAttach={sendFile}
                disabled={session.kind !== "connected"}
              />
              <div className="flex justify-center">
                <PixelButton
                  variant={session.kind === "connected" ? "outline" : "primary"}
                  size="sm"
                  leading={<PixelIcon name="reload" size={14} />}
                  onClick={newPin}
                >
                  start a new pair
                </PixelButton>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <PinDisplay issue={issue} muted={false} />
              <Countdown issue={issue} />
              <Action issue={issue} onNewPin={newPin} />
              <Helper issue={issue} session={session} />
            </div>
          )}
        </div>
      </PixelCard>
    </section>
  );
}

// True iff the page should show the conversation surface rather than
// the PIN-and-countdown surface. A post-connection failure keeps the
// exchange log visible per §7.6.7 #20 ("session ends; exchange log
// preserved in the tab"); the compose box itself is disabled below.
function showExchangeSurface(session: SessionState): boolean {
  if (session.kind === "connected") return true;
  if (session.kind === "failed" && session.failure.postConnection) return true;
  return false;
}

function bannerFromSession(session: SessionState): ConnectBannerState {
  if (session.kind === "connected") return { kind: "connected", sas: session.sas };
  if (session.kind === "failed") return { kind: "failed", failure: session.failure };
  return { kind: "idle" };
}

function PinDisplay({ issue, muted }: { issue: IssueState; muted: boolean }) {
  if (issue.kind === "loading") {
    return <PlaceholderPin label="——" />;
  }
  if (issue.kind === "failed") {
    return <PlaceholderPin label="!!" />;
  }
  const pin = issue.pair.pin;
  const dim = muted || issue.kind === "expired";
  return (
    <div
      className={
        "flex items-center justify-center gap-2 font-[var(--font-mono)] tabular-nums " +
        (dim ? "opacity-40" : "")
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

function Countdown({ issue }: { issue: IssueState }) {
  if (issue.kind === "loading") {
    return (
      <p className="font-[var(--font-body)] text-[14px] opacity-70">
        Issuing PIN…
      </p>
    );
  }
  if (issue.kind === "waiting") {
    return (
      <p className="font-[var(--font-body)] text-[14px] opacity-80">
        expires in{" "}
        <span className="num font-[var(--font-mono)] text-[18px]">
          {issue.remainingSeconds}s
        </span>
      </p>
    );
  }
  if (issue.kind === "expired") {
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
      <span className="num opacity-90">{issue.reason}</span>
    </p>
  );
}

function Action({ issue, onNewPin }: { issue: IssueState; onNewPin: () => void }) {
  const busy = issue.kind === "loading";
  return (
    <PixelButton
      variant={issue.kind === "expired" ? "primary" : "outline"}
      size="md"
      leading={<PixelIcon name="reload" size={16} />}
      disabled={busy}
      onClick={onNewPin}
    >
      {busy ? "issuing…" : "Get a new PIN"}
    </PixelButton>
  );
}

function Helper({ issue, session }: { issue: IssueState; session: SessionState }) {
  let body: string;
  if (session.kind === "connected") {
    body = "Channel is live — content runs peer-to-peer from here.";
  } else if (session.kind === "connecting" && session.phase === "negotiating") {
    body = "Other device joined. Bringing up the encrypted channel…";
  } else if (issue.kind === "expired") {
    body = "PINs are short-lived on purpose — they only live until someone joins.";
  } else {
    body = "On the other device, open Wispr and enter this PIN. Pair stays peer-to-peer; nothing is saved.";
  }
  return (
    <p className="flex items-center gap-2 text-center font-[var(--font-body)] text-[14px] opacity-70">
      <span className="md:hidden">
        <WispMascot
          state={session.kind === "connected" ? "success" : "pairing"}
          size={2}
          animate={false}
        />
      </span>
      <span>{body}</span>
    </p>
  );
}

function remainingSecondsFrom(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
}
