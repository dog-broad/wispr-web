import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PixelPillProps extends HTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  label: string;
  value: string;
}

// A composer pill: little icon + label/value, behaves like a dropdown trigger.
// Pure visual for the M1 bootstrap; wires to a real popover in M1 web phase.
export function PixelPill({ icon, label, value, className, ...rest }: PixelPillProps) {
  return (
    <button
      type="button"
      className={cn(
        "pixel-press inline-flex items-center gap-2",
        "border-[2px] border-[var(--border)] bg-[var(--bg-lifted)]",
        "px-3 py-1.5 font-[var(--font-body)] text-[14px]",
        "shadow-[var(--shadow-pixel-sm)]",
        className,
      )}
      {...rest}
    >
      {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
      {label && <span className="opacity-60">{label}</span>}
      <span className="num text-[16px] leading-none">{value}</span>
      <span aria-hidden className="ml-1 font-[var(--font-mono)] text-[12px]">▾</span>
    </button>
  );
}
