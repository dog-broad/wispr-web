"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { PinInput, emptyPin } from "@/components/pair/PinInput";
import { env } from "@/lib/env";
import { PairSession, type PairPhase } from "@/lib/pair/session";

// Phase for the receiver-side entry → connection sequence.
type Phase =
  | { kind: "entering" }
  | { kind: "connecting"; pin: string; sessionPhase: PairPhase }
  | { kind: "connected"; pin: string; sas: string }
  | { kind: "failed"; pin: string; reason: string };

const PIN_LENGTH = 4;

interface ReceiverProps {
  /** Optional PIN prefill from the URL — QR codes route in via
   *  /r?pin=XXXX so the entry box is filled before the user touches it. */
  initialPin?: string;
}

export function Receiver({ initialPin }: ReceiverProps) {
  const [pin, setPin] = useState<string[]>(() =>
    initialFromString(initialPin, PIN_LENGTH),
  );
  const [phase, setPhase] = useState<Phase>({ kind: "entering" });
  const sessionRef = useRef<PairSession | null>(null);

  const startSession = useCallback((completed: string) => {
    setPhase({ kind: "connecting", pin: completed, sessionPhase: "opening_signaling" });
    sessionRef.current?.close("retrying");
    sessionRef.current = PairSession.createReceiver(
      env.apiBaseUrl,
      { pin: completed },
      {
        onPhase: (sessionPhase) => {
          setPhase((current) => {
            if (current.kind !== "connecting") return current;
            return { ...current, sessionPhase };
          });
        },
        onConnected: ({ sas }) => {
          setPhase({ kind: "connected", pin: completed, sas });
        },
        onFailed: (reason) => {
          setPhase({ kind: "failed", pin: completed, reason });
        },
      },
    );
  }, []);

  // If the URL arrived already-filled, kick the session immediately so
  // the receiver feels instant.
  useEffect(() => {
    if (initialPin && /^[0-9]{4}$/.test(initialPin)) {
      startSession(initialPin);
    }
  }, [initialPin, startSession]);

  // Tear down the session if the component unmounts.
  useEffect(() => {
    return () => {
      sessionRef.current?.close("unmounted");
      sessionRef.current = null;
    };
  }, []);

  const onComplete = useCallback(
    (completed: string) => {
      startSession(completed);
    },
    [startSession],
  );

  const reset = useCallback(() => {
    sessionRef.current?.close("reset");
    sessionRef.current = null;
    setPin(emptyPin(PIN_LENGTH));
    setPhase({ kind: "entering" });
  }, []);

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot
          state={phase.kind === "connected" ? "success" : "pairing"}
          size={3}
        />
      </div>

      <PixelCard variant="lifted" accent="marigold">
        <div className="flex flex-col items-center gap-6 py-2 md:py-4">
          <ConnectBanner phase={phase} />
          <p className="font-[var(--font-body)] text-[14px] uppercase tracking-widest opacity-70">
            enter the 4-digit PIN
          </p>

          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={onComplete}
            length={PIN_LENGTH}
            disabled={phase.kind !== "entering"}
            ariaLabel="Pair PIN"
          />

          <StatusLine phase={phase} />

          <ScanQrAffordance />

          {phase.kind !== "entering" && (
            <PixelButton
              variant="outline"
              size="sm"
              leading={<PixelIcon name="reload" size={14} />}
              onClick={reset}
            >
              start over
            </PixelButton>
          )}
        </div>
      </PixelCard>
    </section>
  );
}

function ConnectBanner({ phase }: { phase: Phase }) {
  if (phase.kind === "connected") {
    return (
      <div className="flex w-full items-center gap-3 border-[2px] border-[var(--color-moss)] bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-body)] text-[14px]">
        <span className="inline-block h-3 w-3 bg-[var(--color-moss)]" aria-hidden />
        <span>Connected</span>
        <span className="ml-auto text-[12px] opacity-60">
          SAS landing in next ship
        </span>
      </div>
    );
  }
  if (phase.kind === "failed") {
    return (
      <div className="flex w-full items-center gap-3 border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-body)] text-[14px]">
        <span className="inline-block h-3 w-3 bg-[var(--color-pink)]" aria-hidden />
        <span className="font-semibold">Pair failed</span>
        <span className="num ml-auto opacity-80">{phase.reason}</span>
      </div>
    );
  }
  return null;
}

function StatusLine({ phase }: { phase: Phase }) {
  if (phase.kind === "entering") {
    return (
      <p className="text-center font-[var(--font-body)] text-[14px] opacity-70">
        the sender will read it out, or share a QR.
      </p>
    );
  }
  if (phase.kind === "connecting") {
    const label = describePhase(phase.sessionPhase);
    return (
      <p className="text-center font-[var(--font-body)] text-[14px]">
        <span className="opacity-70">{label}</span>{" "}
        <span className="num font-[var(--font-mono)]">{phase.pin}</span>
        <span className="opacity-70">…</span>
      </p>
    );
  }
  if (phase.kind === "connected") {
    return (
      <p className="text-center font-[var(--font-body)] text-[14px] opacity-80">
        Channel is live — content runs peer-to-peer from here.
      </p>
    );
  }
  return (
    <p className="text-center font-[var(--font-body)] text-[14px]">
      <span className="font-semibold text-[var(--color-pink)]">
        Couldn&apos;t reach the other device.
      </span>{" "}
      <span className="num opacity-90">{phase.reason}</span>
    </p>
  );
}

function describePhase(phase: PairPhase): string {
  switch (phase) {
    case "opening_signaling":
      return "reaching the relay";
    case "awaiting_peer":
      return "redeeming PIN";
    case "negotiating":
      return "bringing up the channel";
    case "connected":
      return "connected";
    case "closed":
      return "closed";
  }
}

// QR scanning behaves differently across platforms — iOS and Android
// camera apps both auto-detect QRs in the viewfinder, so the most
// reliable mobile path is "point your phone camera at the QR" without
// us shipping a JS scanner. The full in-page camera + decoder lives in
// a follow-up; this affordance points the user at the path that
// already works today.
function ScanQrAffordance() {
  return (
    <div className="flex w-full flex-col items-center gap-1 border-t-[2px] border-[var(--border)] pt-4 opacity-80">
      <p className="inline-flex items-center gap-2 font-[var(--font-body)] text-[14px]">
        <PixelIcon name="grid" size={14} />
        scan a QR with your phone camera
      </p>
      <p className="text-center font-[var(--font-body)] text-[12px] opacity-70">
        most phones decode it from the viewfinder — no special app.
      </p>
    </div>
  );
}

function initialFromString(initial: string | undefined, length: number): string[] {
  const slots = emptyPin(length);
  if (!initial) return slots;
  const digits = initial.replace(/\D/g, "").slice(0, length).split("");
  for (let i = 0; i < digits.length; i += 1) {
    slots[i] = digits[i] ?? "";
  }
  return slots;
}
