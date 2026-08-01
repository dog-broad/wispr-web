"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface PinInputProps {
  /** Current PIN value, one character per slot. Length must equal
   *  ``length``; empty slots are represented as the empty string. */
  value: string[];
  /** Called on every keystroke with the new value array. The parent
   *  owns the state so it can react to partial PINs (focus hints, copy
   *  affordances) and trigger ``onComplete`` itself if desired. */
  onChange: (next: string[]) => void;
  /** Fires when the array is fully populated with digits. Triggers
   *  once per fill transition; clearing a slot and refilling fires it
   *  again. */
  onComplete?: (pin: string) => void;
  /** Total slots. Defaults to 4 (the only configuration M2 needs). */
  length?: number;
  /** Disables every slot. Used for the "resolving…" state where the
   *  parent is doing async work and doesn't want further edits. */
  disabled?: boolean;
  /** Accessibility label applied to the slot group. */
  ariaLabel?: string;
}

const DIGIT_PATTERN = /^[0-9]$/;

export function PinInput({
  value,
  onChange,
  onComplete,
  length = 4,
  disabled = false,
  ariaLabel = "PIN",
}: PinInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // The ref-callback below repopulates ``refs.current`` per render, so
  // we don't need to pre-size the array: entries beyond ``length``
  // simply become unreferenced. (Mutating refs during render is a
  // react-hooks/refs error on the Vercel lint pass.)

  // Auto-focus the first empty slot when the component mounts. Disabled
  // overrides this: the resolving state shouldn't steal focus from
  // whatever the parent surfaces next.
  useEffect(() => {
    if (disabled) return;
    const firstEmpty = value.findIndex((v) => v === "");
    const target = firstEmpty === -1 ? length - 1 : firstEmpty;
    refs.current[target]?.focus();
    // Only on first mount: keystrokes drive focus from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSlot = useCallback(
    (idx: number, digit: string) => {
      const next = value.slice();
      next[idx] = digit;
      onChange(next);
      if (digit !== "") {
        const allFilled = next.every((c) => c !== "");
        if (allFilled) {
          onComplete?.(next.join(""));
        } else if (idx < length - 1) {
          refs.current[idx + 1]?.focus();
        }
      }
    },
    [length, onChange, onComplete, value],
  );

  const onSlotChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Most users will only ever type one character. Some IMEs deliver
    // pasted content via onChange instead of onPaste; fall through to
    // the paste-distribution path if the value is longer than one.
    if (raw.length <= 1) {
      const digit = raw === "" ? "" : raw;
      if (digit !== "" && !DIGIT_PATTERN.test(digit)) return;
      setSlot(idx, digit);
      return;
    }
    distributePaste(idx, raw);
  };

  const onSlotKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      // Empty-slot backspace jumps to the previous slot and clears it.
      // Non-empty backspace just clears in place (the native input
      // handler does that; we only need to handle the empty case).
      if (value[idx] === "" && idx > 0) {
        e.preventDefault();
        const prev = refs.current[idx - 1];
        prev?.focus();
        const next = value.slice();
        next[idx - 1] = "";
        onChange(next);
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
    }
  };

  const onSlotPaste = (idx: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text");
    if (!raw) return;
    e.preventDefault();
    distributePaste(idx, raw);
  };

  const distributePaste = (startIdx: number, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, length - startIdx);
    if (!digits) return;
    const next = value.slice();
    for (let i = 0; i < digits.length; i += 1) {
      next[startIdx + i] = digits[i] ?? "";
    }
    onChange(next);
    const lastFilled = Math.min(startIdx + digits.length - 1, length - 1);
    if (next.every((c) => c !== "")) {
      onComplete?.(next.join(""));
    } else {
      const nextEmpty = next.findIndex((c) => c === "");
      const target = nextEmpty === -1 ? lastFilled : nextEmpty;
      refs.current[target]?.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-2"
    >
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] ?? ""}
          onChange={onSlotChange(idx)}
          onKeyDown={onSlotKeyDown(idx)}
          onPaste={onSlotPaste(idx)}
          disabled={disabled}
          aria-label={`Digit ${idx + 1}`}
          className={cn(
            "inline-flex h-20 w-14 items-center justify-center border-[3px] border-[var(--border)]",
            "bg-[var(--bg-sunk)] text-center font-[var(--font-mono)] text-[56px] leading-none",
            "shadow-[3px_3px_0_0_var(--border)] tabular-nums",
            "focus:bg-[var(--bg-lifted)] focus:outline-none",
            "disabled:opacity-50",
            "md:h-28 md:w-20 md:text-[80px]",
          )}
        />
      ))}
    </div>
  );
}

/** Convenience: an empty-PIN tuple of the right length. */
export function emptyPin(length = 4): string[] {
  return Array.from({ length }, () => "");
}
