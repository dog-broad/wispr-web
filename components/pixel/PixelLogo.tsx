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
// same mark as the favicon). The spark is anchored to the "i" glyph itself —
// not the wordmark's overall width — so it stays put whether the logo sizes to
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
  // Sits centered over the "i", where its tittle would be. Positioned against
  // the "i" wrapper (which is glyph-width), so `left-1/2 -translate-x-1/2`
  // lands dead-center on the letter at any size or layout context.
  return (
    <svg
      aria-hidden
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      className="pixel absolute left-1/2 h-[0.28em] w-[0.28em] -translate-x-1/2"
      style={{ top: "-0.22em" }}
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
