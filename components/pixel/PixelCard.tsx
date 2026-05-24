import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "lifted" | "sunk";
type Accent = "none" | "pink" | "purple" | "moss" | "marigold";

export interface PixelCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: Variant;
  accent?: Accent;
  title?: ReactNode;
  footer?: ReactNode;
}

const variantBg: Record<Variant, string> = {
  default: "bg-[var(--bg)]",
  lifted: "bg-[var(--bg-lifted)]",
  sunk: "bg-[var(--bg-sunk)]",
};

const accentBar: Record<Accent, string> = {
  none: "",
  pink: "before:bg-[var(--color-pink)]",
  purple: "before:bg-[var(--color-purple)]",
  moss: "before:bg-[var(--color-moss)]",
  marigold: "before:bg-[var(--color-marigold)]",
};

export function PixelCard({
  variant = "default",
  accent = "none",
  title,
  footer,
  className,
  children,
  ...rest
}: PixelCardProps) {
  return (
    <div
      className={cn(
        "relative border-[3px] border-[var(--border)] shadow-[4px_4px_0_0_var(--border)]",
        accent !== "none" &&
          "before:absolute before:inset-x-0 before:top-0 before:h-2 before:content-['']",
        variantBg[variant],
        accentBar[accent],
        className,
      )}
      {...rest}
    >
      {title && (
        <div className="border-b-[3px] border-[var(--border)] px-5 py-3 font-[var(--font-display)] text-[14px] tracking-widest uppercase">
          {title}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="border-t-[3px] border-[var(--border)] bg-[var(--bg-sunk)] px-5 py-3 font-[var(--font-mono)] text-[14px]">
          {footer}
        </div>
      )}
    </div>
  );
}
