"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PixelSelectOption<T extends string | number> {
  value: T;
  label: string;
}

export interface PixelSelectPillProps<T extends string | number> {
  icon?: ReactNode;
  label?: string;
  value: T;
  options: ReadonlyArray<PixelSelectOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  /** When true, the pill is visibly disabled and clicks do nothing. Useful
   *  for surfaces where a future feature is represented in the UI but not
   *  yet functional. */
  disabled?: boolean;
  /** Optional native title for hover help — used to call out deferred
   *  features (e.g. "passphrase coming later"). */
  title?: string;
}

// A PixelPill that opens a real dropdown. Visually identical to
// PixelPill — same border, same chevron, same chrome — but a native
// <select> sits at opacity 0 on top of it so clicks land on a browser-
// owned control. The browser handles keyboard nav, focus rings, and on
// mobile renders a native wheel picker, all without us shipping a
// custom popover.
export function PixelSelectPill<T extends string | number>({
  icon,
  label,
  value,
  options,
  onChange,
  className,
  disabled,
  title,
}: PixelSelectPillProps<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <span
      title={title}
      className={cn(
        "pixel-press relative inline-flex items-center gap-2",
        "border-[2px] border-[var(--border)] bg-[var(--bg-lifted)]",
        "px-3 py-1.5 font-[var(--font-body)] text-[14px]",
        "shadow-[var(--shadow-pixel-sm)]",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
      {label && <span className="opacity-60">{label}</span>}
      <span className="num text-[16px] leading-none">{current?.label ?? String(value)}</span>
      <span aria-hidden className="ml-1 font-[var(--font-mono)] text-[12px]">
        ▾
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          const match = options.find((o) => String(o.value) === next);
          if (match) onChange(match.value);
        }}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </span>
  );
}
