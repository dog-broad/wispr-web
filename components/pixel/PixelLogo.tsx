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

// Silkscreen wordmark with a pixel marigold spark over the "i".
// The font does the heavy lifting; we add a single decorative dot for warmth.
export function PixelLogo({ className, size = "md" }: PixelLogoProps) {
  return (
    <span
      aria-label="Wispr"
      className={cn(
        "relative inline-flex select-none items-center font-[var(--font-display)] leading-none tracking-tight",
        sizeStyles[size],
        className,
      )}
    >
      <span aria-hidden>Wispr</span>
      <SparkDot />
      <span className="sr-only">Wispr</span>
    </span>
  );
}

function SparkDot() {
  // Floats above the "i" dot. Position is tuned for Silkscreen at ratio ~ 0.42em right of left edge.
  return (
    <svg
      aria-hidden
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      className="pixel absolute h-[0.18em] w-[0.18em]"
      style={{ left: "calc(50% - 0.06em)", top: "-0.18em" }}
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
