// Hand-rolled inline SVG pixel icons. Each on a 16×16 grid, shape-rendering
// crispEdges, single-color (currentColor) so callers control palette via
// text color tokens. When icon count explodes past ~30, swap to a build-time
// extraction from the `pixelarticons` package.

import { cn } from "@/lib/cn";

interface IconProps {
  size?: number;
  className?: string;
}

function Frame({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
      className={cn("pixel inline-block align-middle", className)}
    >
      <g fill="currentColor">{children}</g>
    </svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="5" y="2" width="6" height="1" />
      <rect x="3" y="3" width="2" height="1" />
      <rect x="11" y="3" width="2" height="1" />
      <rect x="2" y="4" width="1" height="1" />
      <rect x="13" y="4" width="1" height="1" />
      <rect x="2" y="5" width="1" height="6" />
      <rect x="13" y="5" width="1" height="6" />
      <rect x="2" y="11" width="1" height="1" />
      <rect x="13" y="11" width="1" height="1" />
      <rect x="3" y="12" width="2" height="1" />
      <rect x="11" y="12" width="2" height="1" />
      <rect x="5" y="13" width="6" height="1" />
      <rect x="7" y="5" width="1" height="3" />
      <rect x="8" y="7" width="3" height="1" />
    </Frame>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="3" y="5" width="10" height="1" />
      <rect x="2" y="6" width="1" height="1" />
      <rect x="13" y="6" width="1" height="1" />
      <rect x="1" y="7" width="1" height="2" />
      <rect x="14" y="7" width="1" height="2" />
      <rect x="2" y="9" width="1" height="1" />
      <rect x="13" y="9" width="1" height="1" />
      <rect x="3" y="10" width="10" height="1" />
      <rect x="6" y="7" width="4" height="2" />
    </Frame>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="5" y="2" width="6" height="1" />
      <rect x="4" y="3" width="1" height="3" />
      <rect x="11" y="3" width="1" height="3" />
      <rect x="3" y="6" width="10" height="7" />
      <rect x="7" y="8" width="2" height="3" fill="var(--bg)" />
    </Frame>
  );
}

export function KeyIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="3" y="5" width="4" height="4" />
      <rect x="4" y="6" width="2" height="2" fill="var(--bg)" />
      <rect x="7" y="6" width="7" height="2" />
      <rect x="11" y="8" width="1" height="2" />
      <rect x="13" y="8" width="1" height="2" />
    </Frame>
  );
}

export function QrIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="3" y="3" width="3" height="3" fill="var(--bg)" />
      <rect x="4" y="4" width="1" height="1" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="10" y="3" width="3" height="3" fill="var(--bg)" />
      <rect x="11" y="4" width="1" height="1" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="3" y="10" width="3" height="3" fill="var(--bg)" />
      <rect x="4" y="11" width="1" height="1" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="12" y="9" width="2" height="2" />
      <rect x="9" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </Frame>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="2" y="3" width="8" height="1" />
      <rect x="2" y="4" width="1" height="9" />
      <rect x="9" y="4" width="1" height="9" />
      <rect x="2" y="12" width="8" height="1" />
      <rect x="11" y="5" width="3" height="1" />
      <rect x="11" y="6" width="1" height="8" />
      <rect x="13" y="6" width="1" height="8" />
      <rect x="11" y="13" width="3" height="1" />
    </Frame>
  );
}

export function SendIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="2" y="3" width="12" height="1" />
      <rect x="3" y="4" width="11" height="1" />
      <rect x="5" y="5" width="9" height="1" />
      <rect x="7" y="6" width="7" height="1" />
      <rect x="9" y="7" width="5" height="1" />
      <rect x="7" y="8" width="2" height="1" />
      <rect x="5" y="9" width="2" height="1" />
      <rect x="3" y="10" width="2" height="1" />
      <rect x="2" y="11" width="2" height="1" />
    </Frame>
  );
}

export function PairIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="2" y="3" width="5" height="9" />
      <rect x="3" y="4" width="3" height="6" fill="var(--bg)" />
      <rect x="3" y="11" width="3" height="1" fill="var(--bg)" />
      <rect x="9" y="3" width="5" height="9" />
      <rect x="10" y="4" width="3" height="6" fill="var(--bg)" />
      <rect x="10" y="11" width="3" height="1" fill="var(--bg)" />
      <rect x="7" y="7" width="2" height="1" />
    </Frame>
  );
}

export function FloppyIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="2" y="2" width="11" height="1" />
      <rect x="13" y="2" width="1" height="11" />
      <rect x="2" y="13" width="12" height="1" />
      <rect x="2" y="2" width="1" height="12" />
      <rect x="4" y="3" width="6" height="3" fill="var(--color-pink)" />
      <rect x="11" y="3" width="1" height="3" fill="var(--color-pink)" />
      <rect x="4" y="8" width="8" height="5" fill="var(--color-cream)" />
      <rect x="5" y="9" width="6" height="1" />
      <rect x="5" y="11" width="6" height="1" />
    </Frame>
  );
}

export function HeartIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="3" y="3" width="3" height="1" />
      <rect x="10" y="3" width="3" height="1" />
      <rect x="2" y="4" width="5" height="1" />
      <rect x="9" y="4" width="5" height="1" />
      <rect x="2" y="5" width="12" height="2" />
      <rect x="3" y="7" width="10" height="1" />
      <rect x="4" y="8" width="8" height="1" />
      <rect x="5" y="9" width="6" height="1" />
      <rect x="6" y="10" width="4" height="1" />
      <rect x="7" y="11" width="2" height="1" />
    </Frame>
  );
}

export function SparkleIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="7" y="2" width="2" height="2" />
      <rect x="7" y="12" width="2" height="2" />
      <rect x="2" y="7" width="2" height="2" />
      <rect x="12" y="7" width="2" height="2" />
      <rect x="6" y="4" width="4" height="1" />
      <rect x="5" y="5" width="6" height="1" />
      <rect x="4" y="6" width="8" height="4" />
      <rect x="5" y="10" width="6" height="1" />
      <rect x="6" y="11" width="4" height="1" />
    </Frame>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="3" y="6" width="2" height="1" />
      <rect x="11" y="6" width="2" height="1" />
      <rect x="4" y="7" width="2" height="1" />
      <rect x="10" y="7" width="2" height="1" />
      <rect x="5" y="8" width="2" height="1" />
      <rect x="9" y="8" width="2" height="1" />
      <rect x="6" y="9" width="4" height="1" />
      <rect x="7" y="10" width="2" height="1" />
    </Frame>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="12" y="3" width="2" height="2" />
      <rect x="11" y="4" width="2" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      <rect x="9" y="6" width="2" height="2" />
      <rect x="8" y="7" width="2" height="2" />
      <rect x="7" y="8" width="2" height="2" />
      <rect x="6" y="9" width="2" height="2" />
      <rect x="5" y="10" width="2" height="2" />
      <rect x="3" y="8" width="1" height="2" />
      <rect x="4" y="9" width="2" height="2" />
    </Frame>
  );
}

export function CommandIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="3" y="3" width="3" height="1" />
      <rect x="10" y="3" width="3" height="1" />
      <rect x="2" y="4" width="1" height="3" />
      <rect x="13" y="4" width="1" height="3" />
      <rect x="3" y="6" width="10" height="1" />
      <rect x="5" y="7" width="2" height="2" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="3" y="9" width="10" height="1" />
      <rect x="2" y="9" width="1" height="3" />
      <rect x="13" y="9" width="1" height="3" />
      <rect x="3" y="12" width="3" height="1" />
      <rect x="10" y="12" width="3" height="1" />
    </Frame>
  );
}

export function EnvelopeIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <rect x="2" y="4" width="12" height="1" />
      <rect x="2" y="5" width="1" height="7" />
      <rect x="13" y="5" width="1" height="7" />
      <rect x="2" y="12" width="12" height="1" />
      <rect x="3" y="5" width="2" height="1" />
      <rect x="11" y="5" width="2" height="1" />
      <rect x="4" y="6" width="2" height="1" />
      <rect x="10" y="6" width="2" height="1" />
      <rect x="5" y="7" width="2" height="1" />
      <rect x="9" y="7" width="2" height="1" />
      <rect x="7" y="8" width="2" height="1" />
    </Frame>
  );
}
