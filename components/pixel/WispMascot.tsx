import { cn } from "@/lib/cn";

export type WispState =
  | "idle"
  | "wave"
  | "sending"
  | "linking"
  | "pinning"
  | "pairing"
  | "success"
  | "error"
  | "sleeping";

export interface WispMascotProps {
  state?: WispState;
  size?: number; // pixel scale; 1 unit = 1 SVG pixel. Final width = 16 * size.
  className?: string;
  /** Animate idle bob + blink. Disabled on prefers-reduced-motion globally. */
  animate?: boolean;
}

// The Wisp — 16×16 grid spirit. Cream body, marigold eyes (moss when happy,
// pink when blushing). The wisp-tail trails below. Each `state` swaps the
// accessory the Wisp is carrying or its facial expression.
export function WispMascot({
  state = "idle",
  size = 4,
  className,
  animate = true,
}: WispMascotProps) {
  return (
    <span
      className={cn(
        "pixel inline-block align-middle",
        animate && "anim-wisp-bob",
        className,
      )}
      style={{ width: 24 * size, height: 24 * size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={24 * size}
        height={24 * size}
        shapeRendering="crispEdges"
      >
        <Body state={state} animate={animate} />
        <Accessory state={state} />
      </svg>
    </span>
  );
}

function Body({ state, animate }: { state: WispState; animate: boolean }) {
  const isSleep = state === "sleeping";
  const isError = state === "error";
  const isSuccess = state === "success";

  // Base ghost shape, 12-wide × 14-tall, centered in a 24×24 frame.
  // Pixel layout (x offsets from 6, y offsets from 4):
  //
  //    . . X X X X X X . .
  //    . X X X X X X X X .
  //    X X X X X X X X X X
  //    X X X X X X X X X X
  //    X X o X X X X o X X
  //    X X o X X X X o X X    <- eyes
  //    X X X X X X X X X X
  //    X X X X X m m X X X    <- mouth (state-dependent)
  //    X X X X X X X X X X
  //    X X X X X X X X X X
  //    X . X . X . X . X .    <- wisp-tail
  //
  const cream = "var(--color-cream)";
  const navy = "var(--color-navy)";
  const eye = isSuccess ? "var(--color-moss)" : isError ? "var(--color-pink)" : "var(--color-marigold)";
  const mouth = isError ? "var(--color-pink)" : isSuccess ? "var(--color-moss-dark)" : "var(--color-navy)";

  return (
    <g>
      {/* outline shadow (creates the chunky pixel feel) */}
      <rect x="5" y="4" width="14" height="14" fill={navy} />
      {/* main body */}
      <rect x="6" y="4" width="12" height="14" fill={cream} />
      {/* rounded top (one pixel inset on each top corner) */}
      <rect x="5" y="4" width="1" height="2" fill={cream} />
      <rect x="18" y="4" width="1" height="2" fill={cream} />
      <rect x="5" y="4" width="1" height="1" fill={navy} opacity="0" />
      {/* eyes */}
      <g className={animate ? "anim-wisp-blink" : ""}>
        <rect x="8" y="9" width="2" height="2" fill={eye} />
        <rect x="14" y="9" width="2" height="2" fill={eye} />
      </g>
      {/* mouth — corners up + bar below = smile; bar up + corners down = frown */}
      {isSuccess ? (
        <>
          {/* smile: corners high, bar low */}
          <rect x="10" y="13" width="1" height="1" fill={mouth} />
          <rect x="14" y="13" width="1" height="1" fill={mouth} />
          <rect x="11" y="14" width="3" height="1" fill={mouth} />
        </>
      ) : isError ? (
        <>
          {/* frown: bar high, corners drop and spread */}
          <rect x="11" y="13" width="3" height="1" fill={mouth} />
          <rect x="10" y="14" width="1" height="1" fill={mouth} />
          <rect x="14" y="14" width="1" height="1" fill={mouth} />
        </>
      ) : isSleep ? (
        <rect x="10" y="13" width="4" height="1" fill={mouth} />
      ) : (
        <rect x="11" y="13" width="2" height="1" fill={mouth} />
      )}
      {/* cheek blush */}
      <rect x="7" y="11" width="1" height="1" fill="var(--color-pink)" opacity="0.7" />
      <rect x="16" y="11" width="1" height="1" fill="var(--color-pink)" opacity="0.7" />
      {/* wisp-tail */}
      <g fill={cream}>
        <rect x="6" y="18" width="2" height="2" />
        <rect x="10" y="18" width="2" height="2" />
        <rect x="14" y="18" width="2" height="2" />
        <rect x="8" y="20" width="2" height="1" />
        <rect x="12" y="20" width="2" height="1" />
      </g>
      <g fill={navy}>
        <rect x="6" y="20" width="2" height="1" />
        <rect x="10" y="20" width="2" height="1" />
        <rect x="14" y="20" width="2" height="1" />
      </g>
      {/* Sleep "Z" floating above */}
      {isSleep && (
        <g fill="var(--color-purple)">
          <rect x="19" y="1" width="3" height="1" />
          <rect x="21" y="2" width="1" height="1" />
          <rect x="20" y="3" width="1" height="1" />
          <rect x="19" y="4" width="3" height="1" />
        </g>
      )}
    </g>
  );
}

function Accessory({ state }: { state: WispState }) {
  // Each accessory is a tiny inline pixel sprite placed near the Wisp's "hand"
  // (lower-right, around 18,12 area).
  switch (state) {
    case "sending":
      return (
        <g>
          {/* paper plane, 5×4, marigold */}
          <g fill="var(--color-marigold)">
            <rect x="18" y="11" width="5" height="1" />
            <rect x="19" y="12" width="4" height="1" />
            <rect x="20" y="13" width="3" height="1" />
            <rect x="21" y="14" width="2" height="1" />
          </g>
          <rect x="18" y="11" width="1" height="1" fill="var(--color-marigold-dark)" />
        </g>
      );
    case "linking":
      return (
        <g fill="var(--color-pink)">
          {/* key sprite, 5×6 */}
          <rect x="19" y="11" width="3" height="3" />
          <rect x="20" y="12" width="1" height="1" fill="var(--color-navy)" />
          <rect x="22" y="12" width="2" height="1" />
          <rect x="22" y="14" width="1" height="1" />
          <rect x="23" y="13" width="1" height="2" />
        </g>
      );
    case "pinning":
      return (
        <g>
          {/* PIN ticket, 5×4 purple */}
          <rect x="18" y="11" width="6" height="5" fill="var(--color-purple)" />
          <rect x="19" y="12" width="1" height="1" fill="var(--color-cream)" />
          <rect x="21" y="12" width="1" height="1" fill="var(--color-cream)" />
          <rect x="19" y="14" width="1" height="1" fill="var(--color-cream)" />
          <rect x="21" y="14" width="1" height="1" fill="var(--color-cream)" />
          <rect x="23" y="13" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "pairing":
      return (
        <g fill="var(--color-moss)">
          {/* antenna with signal waves */}
          <rect x="20" y="11" width="1" height="4" />
          <rect x="19" y="11" width="3" height="1" />
          <rect x="22" y="10" width="1" height="1" />
          <rect x="23" y="9" width="1" height="1" />
          <rect x="18" y="10" width="1" height="1" />
          <rect x="17" y="9" width="1" height="1" />
        </g>
      );
    case "wave":
      return (
        <g fill="var(--color-cream)" stroke="var(--color-navy)" strokeWidth="0.5">
          {/* a little waving hand */}
          <rect x="19" y="9" width="2" height="2" />
          <rect x="20" y="7" width="1" height="2" />
        </g>
      );
    default:
      return null;
  }
}
