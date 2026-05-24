import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--color-pink)] text-[var(--color-navy)] border-[var(--color-navy)]",
  secondary:
    "bg-[var(--color-purple)] text-[var(--color-cream)] border-[var(--color-navy)]",
  ghost:
    "bg-[var(--bg-lifted)] text-[var(--fg)] border-[var(--border)]",
  outline:
    "bg-transparent text-[var(--fg)] border-[var(--border)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-[14px]",
  md: "h-12 px-5 text-[16px]",
  lg: "h-16 px-7 text-[22px]",
};

export function PixelButton({
  variant = "primary",
  size = "md",
  block,
  leading,
  trailing,
  className,
  children,
  type = "button",
  ...rest
}: PixelButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "pixel-press inline-flex items-center justify-center gap-2",
        "border-[3px] font-[var(--font-body)] font-semibold tracking-wide",
        "shadow-[4px_4px_0_0_var(--border)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {leading}
      <span>{children}</span>
      {trailing}
    </button>
  );
}
