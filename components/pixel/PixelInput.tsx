import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const sharedStyles =
  "block w-full border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] " +
  "px-3 py-2 font-[var(--font-body)] text-[16px] text-[var(--fg)] " +
  "placeholder:text-[var(--fg)] placeholder:opacity-50 " +
  "shadow-[inset_2px_2px_0_0_color-mix(in_srgb,var(--border)_30%,transparent)] " +
  "focus:outline-none focus:shadow-[inset_2px_2px_0_0_var(--color-pink)] " +
  "focus:border-[var(--color-pink)]";

export type PixelInputProps = InputHTMLAttributes<HTMLInputElement>;

export function PixelInput({ className, ...rest }: PixelInputProps) {
  return <input className={cn(sharedStyles, className)} {...rest} />;
}

export type PixelTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function PixelTextarea({ className, rows = 6, ...rest }: PixelTextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(sharedStyles, "font-[var(--font-mono)] text-[18px]", className)}
      {...rest}
    />
  );
}
