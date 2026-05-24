import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "warn" | "error" | "info" | "neutral";

export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  success: "bg-[var(--color-moss)] text-[var(--color-navy)]",
  warn: "bg-[var(--color-marigold)] text-[var(--color-navy)]",
  error: "bg-[var(--color-pink)] text-[var(--color-navy)]",
  info: "bg-[var(--color-purple)] text-[var(--color-cream)]",
  neutral: "bg-[var(--bg-sunk)] text-[var(--fg)]",
};

export function PixelBadge({ tone = "neutral", className, children, ...rest }: PixelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-[2px] border-[var(--border)]",
        "px-2 py-0.5 font-[var(--font-display)] text-[12px] tracking-widest uppercase",
        toneStyles[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
