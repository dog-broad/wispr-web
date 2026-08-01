"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/cn";

export interface PixelQrProps {
  /** The data the QR encodes: typically the full receive URL including the
   *  `#k=` fragment so a scanning phone can fetch and decrypt in one step. */
  value: string;
  /** Pixel side length of the rendered QR square. Defaults to 192 (chunky
   *  enough to scan from across a room, small enough to sit in the sent
   *  state without crowding the URL). */
  size?: number;
  className?: string;
  label?: string;
}

// Wraps qrcode.react's SVG renderer in a chunky pixel frame so the QR
// reads as part of the design instead of dropping a smooth black square
// onto a pixel-art canvas. The modules themselves are already
// pixel-grid-aligned by virtue of being a QR; we just need to keep
// browsers from smoothing them on high-DPR displays.
export function PixelQr({ value, size = 192, className, label }: PixelQrProps) {
  return (
    <div
      role="img"
      aria-label={label ?? "QR code"}
      className={cn(
        "pixel inline-flex shrink-0 border-[3px] border-[var(--border)] bg-[var(--color-cream)] p-2 shadow-[var(--shadow-pixel)]",
        className,
      )}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="transparent"
        fgColor="#1f1a2e"
        marginSize={0}
        level="M"
      />
    </div>
  );
}
