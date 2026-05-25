"use client";

import { useCallback, useEffect, useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { PinInput, emptyPin } from "@/components/pair/PinInput";

// Phase covers the lifecycle of a single redeem attempt.
// ``resolving`` is the placeholder while the redeem flow is wired up
// in the next task — it lets the input UI feel complete without
// committing to the WS + WebRTC layer here.
type Phase =
  | { kind: "entering" }
  | { kind: "resolving"; pin: string }
  | { kind: "stub_complete"; pin: string };

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

  // If the URL arrived already-filled, transition straight into the
  // resolving placeholder so the receiver feels immediate.
  useEffect(() => {
    if (initialPin && /^[0-9]{4}$/.test(initialPin)) {
      setPhase({ kind: "resolving", pin: initialPin });
    }
  }, [initialPin]);

  const onComplete = useCallback((completed: string) => {
    setPhase({ kind: "resolving", pin: completed });
  }, []);

  const reset = useCallback(() => {
    setPin(emptyPin(PIN_LENGTH));
    setPhase({ kind: "entering" });
  }, []);

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot state="pairing" size={3} />
      </div>

      <PixelCard variant="lifted" accent="marigold">
        <div className="flex flex-col items-center gap-6 py-2 md:py-4">
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

function StatusLine({ phase }: { phase: Phase }) {
  if (phase.kind === "entering") {
    return (
      <p className="text-center font-[var(--font-body)] text-[14px] opacity-70">
        the sender will read it out, or share a QR.
      </p>
    );
  }
  if (phase.kind === "resolving") {
    return (
      <p className="text-center font-[var(--font-body)] text-[14px]">
        <span className="opacity-70">resolving PIN</span>{" "}
        <span className="num font-[var(--font-mono)]">{phase.pin}</span>
        <span className="opacity-70">…</span>
      </p>
    );
  }
  return (
    <p className="text-center font-[var(--font-body)] text-[14px] opacity-70">
      PIN <span className="num font-[var(--font-mono)]">{phase.pin}</span>{" "}
      captured.
    </p>
  );
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
