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
  /** Pixel scale. Final width = 24 * size. Default 4 -> 96 px square. */
  size?: number;
  className?: string;
  /** Animate idle bob + blink. prefers-reduced-motion disables globally. */
  animate?: boolean;
}

// The Wisp — a kawaii pixel spirit on a 24×24 grid.
//
// Body silhouette: a chunky cream capsule with a rounded top cap and a
// single curling wisp-tail that trails out to the lower-right (instead
// of the older three-tab "feet" that read more like a sock puppet than
// a ghost). Each `state` swaps the held accessory and the expression.
//
// Pixel geometry, in viewBox units:
//   - body trunk:   x=4..19, y=2..15  (rounded top, scalloped capsule)
//   - eyes:         (8,8)-(9,9)  and (14,8)-(15,9)  with cream sparkle
//   - mouth:        clustered around (11,12)-(13,13), state-dependent
//   - cheek blush:  (6,10) and (17,10)
//   - wisp-tail:    diagonal curl from (13,16) down to (19,20)
//   - accessory:    floats at the "hand" — around (18,11) to (23,15)
//
// All shapes are 1×1 rects, rendered with shape-rendering: crispEdges
// so they stay pin-sharp at any integer scale.
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
        {state === "sleeping" && <SleepZ />}
      </svg>
    </span>
  );
}

function Body({ state, animate }: { state: WispState; animate: boolean }) {
  const isSleep = state === "sleeping";
  const isError = state === "error";
  const isSuccess = state === "success";
  const isWave = state === "wave";

  const cream = "var(--color-cream)";
  const creamHi = "#ffffff"; // pure-white sparkle on top-left of each eye
  const navy = "var(--color-navy)";
  const eye = isSuccess
    ? "var(--color-moss)"
    : isError
      ? "var(--color-pink)"
      : "var(--color-marigold)";
  const eyeShadow = isSuccess
    ? "var(--color-moss-dark)"
    : isError
      ? "var(--color-pink-dark)"
      : "var(--color-marigold-dark)";
  const mouth = isError
    ? "var(--color-pink)"
    : isSuccess
      ? "var(--color-moss-dark)"
      : navy;
  const blush = "var(--color-pink)";

  return (
    <g>
      {/* ---------- silhouette outline (navy), drawn first ---------- */}
      {/* top cap (rounded) */}
      <rect x="9" y="1" width="6" height="1" fill={navy} />
      <rect x="7" y="2" width="2" height="1" fill={navy} />
      <rect x="15" y="2" width="2" height="1" fill={navy} />
      <rect x="6" y="3" width="1" height="1" fill={navy} />
      <rect x="17" y="3" width="1" height="1" fill={navy} />
      <rect x="5" y="4" width="1" height="1" fill={navy} />
      <rect x="18" y="4" width="1" height="1" fill={navy} />
      {/* main trunk side outlines (y=5..14) */}
      <rect x="4" y="5" width="1" height="10" fill={navy} />
      <rect x="19" y="5" width="1" height="10" fill={navy} />
      {/* base — scalloped underside */}
      <rect x="4" y="15" width="1" height="1" fill={navy} />
      <rect x="6" y="15" width="2" height="1" fill={navy} />
      <rect x="10" y="15" width="2" height="1" fill={navy} />
      <rect x="14" y="15" width="2" height="1" fill={navy} />
      <rect x="18" y="15" width="2" height="1" fill={navy} />
      <rect x="5" y="16" width="1" height="1" fill={navy} />
      <rect x="8" y="16" width="2" height="1" fill={navy} />
      <rect x="12" y="16" width="2" height="1" fill={navy} />
      <rect x="16" y="16" width="2" height="1" fill={navy} />

      {/* ---------- cream body fill ---------- */}
      <rect x="9" y="2" width="6" height="1" fill={cream} />
      <rect x="7" y="3" width="10" height="1" fill={cream} />
      <rect x="6" y="4" width="12" height="1" fill={cream} />
      <rect x="5" y="5" width="14" height="10" fill={cream} />
      {/* fill the scallop "humps" between the bottom navy gaps */}
      <rect x="5" y="15" width="1" height="1" fill={cream} />
      <rect x="8" y="15" width="2" height="1" fill={cream} />
      <rect x="12" y="15" width="2" height="1" fill={cream} />
      <rect x="16" y="15" width="2" height="1" fill={cream} />
      <rect x="6" y="16" width="2" height="1" fill={cream} />
      <rect x="10" y="16" width="2" height="1" fill={cream} />
      <rect x="14" y="16" width="2" height="1" fill={cream} />
      {/* soft 1-px shadow under the top cap to give volume */}
      <rect x="9" y="3" width="6" height="1" fill={cream} opacity="0.6" />

      {/* ---------- wisp-tail (single trailing curl) ---------- */}
      {/* outline first */}
      <rect x="14" y="17" width="2" height="1" fill={navy} />
      <rect x="13" y="17" width="1" height="1" fill={navy} />
      <rect x="16" y="17" width="1" height="1" fill={navy} />
      <rect x="14" y="18" width="1" height="1" fill={navy} />
      <rect x="17" y="18" width="2" height="1" fill={navy} />
      <rect x="16" y="18" width="1" height="1" fill={navy} />
      <rect x="17" y="19" width="1" height="1" fill={navy} />
      <rect x="19" y="19" width="1" height="1" fill={navy} />
      <rect x="18" y="20" width="2" height="1" fill={navy} />
      {/* cream fill */}
      <rect x="14" y="17" width="2" height="1" fill={cream} />
      <rect x="15" y="18" width="2" height="1" fill={cream} />
      <rect x="18" y="19" width="1" height="1" fill={cream} />

      {/* ---------- eyes ---------- */}
      <g className={animate ? "anim-wisp-blink" : ""}>
        {isSleep ? (
          // Closed crescents — three-pixel arcs angled to read as "asleep"
          <>
            <rect x="7" y="9" width="1" height="1" fill={navy} />
            <rect x="8" y="8" width="2" height="1" fill={navy} />
            <rect x="13" y="9" width="1" height="1" fill={navy} />
            <rect x="14" y="8" width="2" height="1" fill={navy} />
          </>
        ) : (
          <>
            {/* drop-shadow under each iris for depth */}
            <rect x="8" y="10" width="2" height="1" fill={eyeShadow} opacity="0.55" />
            <rect x="14" y="10" width="2" height="1" fill={eyeShadow} opacity="0.55" />
            {/* irises */}
            <rect x="8" y="8" width="2" height="2" fill={eye} />
            <rect x="14" y="8" width="2" height="2" fill={eye} />
            {/* cream sparkles (top-left of each eye) */}
            <rect x="8" y="8" width="1" height="1" fill={creamHi} />
            <rect x="14" y="8" width="1" height="1" fill={creamHi} />
          </>
        )}
      </g>

      {/* ---------- mouth ---------- */}
      {isSuccess ? (
        // smile: small u-shape
        <>
          <rect x="10" y="12" width="1" height="1" fill={mouth} />
          <rect x="13" y="12" width="1" height="1" fill={mouth} />
          <rect x="11" y="13" width="2" height="1" fill={mouth} />
        </>
      ) : isError ? (
        // frown: inverted u-shape
        <>
          <rect x="11" y="12" width="2" height="1" fill={mouth} />
          <rect x="10" y="13" width="1" height="1" fill={mouth} />
          <rect x="13" y="13" width="1" height="1" fill={mouth} />
        </>
      ) : isSleep ? (
        // open little snoring mouth
        <>
          <rect x="11" y="13" width="2" height="1" fill={mouth} />
          <rect x="11" y="12" width="2" height="1" fill={mouth} opacity="0.3" />
        </>
      ) : isWave ? (
        // open grin
        <>
          <rect x="11" y="12" width="2" height="1" fill={mouth} />
          <rect x="11" y="13" width="2" height="1" fill={mouth} />
          <rect x="10" y="12" width="1" height="1" fill={mouth} />
          <rect x="13" y="12" width="1" height="1" fill={mouth} />
        </>
      ) : (
        // neutral: small flat line
        <rect x="11" y="13" width="2" height="1" fill={mouth} />
      )}

      {/* ---------- cheek blush ---------- */}
      <rect x="6" y="10" width="1" height="1" fill={blush} opacity="0.75" />
      <rect x="17" y="10" width="1" height="1" fill={blush} opacity="0.75" />
      <rect x="7" y="11" width="1" height="1" fill={blush} opacity="0.4" />
      <rect x="16" y="11" width="1" height="1" fill={blush} opacity="0.4" />
    </g>
  );
}

function Accessory({ state }: { state: WispState }) {
  // Held in the Wisp's "hand," right of body around (18..23, 10..15).
  switch (state) {
    case "sending":
      // Folded paper plane, 6×5 cream + navy outline + marigold tail flash
      return (
        <g>
          {/* outline */}
          <rect x="18" y="10" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="11" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="10" width="1" height="3" fill="var(--color-navy)" />
          <rect x="22" y="13" width="1" height="1" fill="var(--color-navy)" />
          <rect x="21" y="14" width="1" height="1" fill="var(--color-navy)" />
          <rect x="19" y="15" width="3" height="1" fill="var(--color-navy)" />
          {/* paper body */}
          <rect x="19" y="11" width="4" height="2" fill="var(--color-cream)" />
          <rect x="19" y="13" width="3" height="1" fill="var(--color-cream)" />
          <rect x="19" y="14" width="2" height="1" fill="var(--color-cream)" />
          {/* center crease */}
          <rect x="20" y="11" width="1" height="3" fill="var(--color-cream-200)" />
          {/* marigold thrust flash trailing the plane */}
          <rect x="17" y="13" width="1" height="1" fill="var(--color-marigold)" />
          <rect x="16" y="14" width="1" height="1" fill="var(--color-marigold)" opacity="0.7" />
        </g>
      );
    case "linking":
      // Pink key with circular bow + toothed shaft, 7×5
      return (
        <g>
          {/* bow (ring) */}
          <rect x="17" y="11" width="3" height="3" fill="var(--color-pink)" />
          <rect x="18" y="12" width="1" height="1" fill="var(--color-navy)" />
          {/* shaft */}
          <rect x="20" y="12" width="3" height="1" fill="var(--color-pink)" />
          {/* teeth */}
          <rect x="22" y="13" width="1" height="1" fill="var(--color-pink)" />
          <rect x="20" y="13" width="1" height="1" fill="var(--color-pink)" />
          {/* navy outline */}
          <rect x="17" y="10" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="14" width="3" height="1" fill="var(--color-navy)" />
          <rect x="16" y="11" width="1" height="3" fill="var(--color-navy)" />
          <rect x="20" y="11" width="3" height="1" fill="var(--color-navy)" />
          <rect x="23" y="12" width="1" height="2" fill="var(--color-navy)" />
        </g>
      );
    case "pinning":
      // Purple ticket with 4-pip numerals + perforated edge, 6×5
      return (
        <g>
          {/* outline */}
          <rect x="17" y="10" width="7" height="1" fill="var(--color-navy)" />
          <rect x="17" y="15" width="7" height="1" fill="var(--color-navy)" />
          <rect x="17" y="11" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="11" width="1" height="4" fill="var(--color-navy)" />
          {/* body */}
          <rect x="18" y="11" width="5" height="4" fill="var(--color-purple)" />
          {/* perforation tear-line in middle */}
          <rect x="20" y="11" width="1" height="1" fill="var(--color-cream)" opacity="0.5" />
          <rect x="20" y="13" width="1" height="1" fill="var(--color-cream)" opacity="0.5" />
          {/* 4 cream pips */}
          <rect x="19" y="12" width="1" height="1" fill="var(--color-cream)" />
          <rect x="21" y="12" width="1" height="1" fill="var(--color-cream)" />
          <rect x="19" y="14" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="13" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "pairing":
      // Moss antenna with concentric signal arcs, 6×6
      return (
        <g>
          {/* base + mast */}
          <rect x="20" y="11" width="1" height="4" fill="var(--color-moss)" />
          <rect x="19" y="14" width="3" height="1" fill="var(--color-moss)" />
          <rect x="19" y="15" width="3" height="1" fill="var(--color-navy)" />
          {/* dish bracket */}
          <rect x="19" y="10" width="3" height="1" fill="var(--color-moss)" />
          <rect x="19" y="9" width="1" height="1" fill="var(--color-moss)" />
          <rect x="21" y="9" width="1" height="1" fill="var(--color-moss)" />
          {/* signal arcs — both sides for the "broadcasting" feel */}
          <rect x="17" y="11" width="1" height="1" fill="var(--color-moss)" />
          <rect x="16" y="10" width="1" height="1" fill="var(--color-moss)" opacity="0.7" />
          <rect x="23" y="11" width="1" height="1" fill="var(--color-moss)" />
          {/* small marigold blink at the tip */}
          <rect x="20" y="9" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "wave":
      // A little waving hand, 3×3 cream + navy outline (anchored at body edge)
      return (
        <g>
          <rect x="18" y="6" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="7" width="1" height="3" fill="var(--color-navy)" />
          <rect x="21" y="7" width="1" height="3" fill="var(--color-navy)" />
          <rect x="18" y="10" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="7" width="3" height="3" fill="var(--color-cream)" />
          {/* finger creases */}
          <rect x="19" y="7" width="1" height="1" fill="var(--color-cream-200)" />
          <rect x="20" y="8" width="1" height="1" fill="var(--color-cream-200)" />
        </g>
      );
    default:
      return null;
  }
}

function SleepZ() {
  // Two stacked Z's floating up and to the right.
  return (
    <g fill="var(--color-purple)">
      {/* big Z */}
      <rect x="19" y="1" width="3" height="1" />
      <rect x="21" y="2" width="1" height="1" />
      <rect x="20" y="3" width="1" height="1" />
      <rect x="19" y="4" width="3" height="1" />
      {/* small Z above */}
      <rect x="22" y="0" width="2" height="1" opacity="0.7" />
      <rect x="22" y="2" width="2" height="1" opacity="0.7" />
      <rect x="23" y="1" width="1" height="1" opacity="0.7" />
    </g>
  );
}
