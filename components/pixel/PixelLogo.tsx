import { cn } from "@/lib/cn";

export interface PixelLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles: Record<NonNullable<PixelLogoProps["size"]>, string> = {
  sm: "text-[20px]",
  md: "text-[28px]",
  lg: "text-[40px]",
  xl: "text-[64px]",
};

// Silkscreen wordmark whose "i" is dotted with the marigold brand spark (the
// same mark as the favicon). The spark is anchored to the "i" glyph itself
// (not the wordmark's overall width) so it stays put whether the logo sizes to
// its text (header) or gets stretched by a flex parent (footer). `w-fit` also
// stops that stretch so the click/hover area matches the word.
export function PixelLogo({ className, size = "md" }: PixelLogoProps) {
  return (
    <span
      aria-label="Wispr"
      className={cn(
        "relative inline-flex w-fit select-none items-center font-[var(--font-display)] leading-none tracking-tight",
        sizeStyles[size],
        className,
      )}
    >
      <span aria-hidden>
        W
        <span className="relative inline-block">
          i
          <SparkDot />
        </span>
        spr
      </span>
      <span className="sr-only">Wispr</span>
    </span>
  );
}

function SparkDot() {
  // Sits *on* the "i" tittle: the marigold spark replaces the letter's dot
  // rather than floating above it. Anchored to the "i" wrapper (glyph-width),
  // so `left-1/2 -translate-x-1/2` centres it and `top` seats it over the dot
  // at any size. Sized to cover the font's own tittle so it reads as one mark.
  return (
    <svg
      aria-hidden
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      className="pixel absolute left-1/2 h-[0.3em] w-[0.3em] -translate-x-1/2"
      style={{ top: "0.02em" }}
    >
      <g fill="var(--color-marigold)">
        <rect x="2" y="0" width="1" height="5" />
        <rect x="0" y="2" width="5" height="1" />
        <rect x="1" y="1" width="3" height="3" />
      </g>
      <rect x="2" y="2" width="1" height="1" fill="var(--color-pink)" />
    </svg>
  );
}
