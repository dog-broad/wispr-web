import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PixelPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  label: string;
  value: string;
}

// A composer pill: little icon + label/value, behaves like a dropdown
// trigger. Disabled pills render visibly muted and stop the press
// animation; clicks are blocked by the underlying disabled attribute.
export function PixelPill({
  icon,
  label,
  value,
  className,
  disabled,
  ...rest
}: PixelPillProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2",
        "border-[2px] border-[var(--border)] bg-[var(--bg-lifted)]",
        "px-3 py-1.5 font-[var(--font-body)] text-[14px]",
        "shadow-[var(--shadow-pixel-sm)]",
        disabled ? "cursor-not-allowed opacity-60" : "pixel-press",
        className,
      )}
      {...rest}
    >
      {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
      {label && <span className="opacity-60">{label}</span>}
      <span className="num text-[16px] leading-none">{value}</span>
      <span aria-hidden className="ml-1 font-[var(--font-mono)] text-[12px]">
        ▾
      </span>
    </button>
  );
}
