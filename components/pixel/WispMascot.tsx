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
// Silhouette: an oval cream capsule, widest at the chest (14 px) and
// tapering on both ends. A single flame-shaped wisp-tail drops from the
// underside and curls back to the right at the tip. The whole shape is
// one continuous body, so the spirit reads as "floating," not "wearing
// shoes" (which was the failure mode of the old three-tab feet).
//
// Pixel anatomy (in viewBox units):
//   - dome cap:   y=1..5  cream widens 6 → 14
//   - chest:      y=6..13 14-wide trunk
//   - underbelly: y=14..16 tapers 12 → 10 → 6
//   - tail:       y=17..20 4 → 3 → 2 → 1, curling to the right
//   - eyes:       (8,8)..(9,9) and (14,8)..(15,9)
//   - mouth:      around (10..13, 11..12), state-dependent
//   - blush:      (6,10) + (17,10), softer halo at row 11
//   - accessory:  cols 17..23, generally rows 9..15 (the "hand")
//   - sleep Z:    cols 19..23, rows 0..4 (top-right corner)
//
// The silhouette is described declaratively in CREAM_ROWS below — each
// entry is one row of cream interior. The navy outline is derived by
// drawing the same silhouette one pixel wider on every side underneath,
// plus a manual top cap, two underbelly shoulders, and a tail terminal.

type Row = readonly [y: number, x0: number, x1: number];

const CREAM_ROWS: readonly Row[] = [
  // dome cap (rows expand 1 col per side per step)
  [2, 9, 14],
  [3, 8, 15],
  [4, 7, 16],
  [5, 6, 17],
  // chest — full 14-wide trunk
  [6, 5, 18],
  [7, 5, 18],
  [8, 5, 18],
  [9, 5, 18],
  [10, 5, 18],
  [11, 5, 18],
  [12, 5, 18],
  [13, 5, 18],
  // underbelly taper
  [14, 6, 17],
  [15, 7, 16],
  [16, 9, 14],
  // wisp-tail, curls right at the tip
  [17, 10, 13],
  [18, 11, 13],
  [19, 12, 13],
  [20, 13, 13],
];

// Pixels that need navy but aren't covered by the wider-silhouette
// pass: the top dome cap, the two shoulders where the underbelly
// narrows faster than 1 px/row, and the terminal pixel below the tail.
const NAVY_EXTRAS: readonly { x: number; y: number; w?: number }[] = [
  { x: 9, y: 1, w: 6 }, // top dome cap
  { x: 7, y: 16 }, // left shoulder of body→tail transition
  { x: 16, y: 16 }, // right shoulder of body→tail transition
  { x: 13, y: 21 }, // terminal under the tail tip
];

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
  const creamShine = "var(--color-cream-50)";
  const sparkle = "#ffffff";
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
      {/* ----- navy outline: the cream silhouette grown by 1 px ----- */}
      {CREAM_ROWS.map(([y, a, b]) => (
        <rect
          key={`n-${y}`}
          x={a - 1}
          y={y}
          width={b - a + 3}
          height="1"
          fill={navy}
        />
      ))}
      {NAVY_EXTRAS.map(({ x, y, w = 1 }) => (
        <rect key={`nx-${x}-${y}`} x={x} y={y} width={w} height="1" fill={navy} />
      ))}

      {/* ----- cream interior ----- */}
      {CREAM_ROWS.map(([y, a, b]) => (
        <rect
          key={`c-${y}`}
          x={a}
          y={y}
          width={b - a + 1}
          height="1"
          fill={cream}
        />
      ))}

      {/* forehead shine — two soft highlights just inside the dome */}
      <rect x="8" y="4" width="1" height="1" fill={creamShine} />
      <rect x="9" y="3" width="1" height="1" fill={creamShine} />

      {/* ----- eyes ----- */}
      <g className={animate ? "anim-wisp-blink" : ""}>
        {isSleep ? (
          // closed crescents — gentle downward arc
          <>
            <rect x="7" y="9" width="1" height="1" fill={navy} />
            <rect x="8" y="8" width="2" height="1" fill={navy} />
            <rect x="13" y="9" width="1" height="1" fill={navy} />
            <rect x="14" y="8" width="2" height="1" fill={navy} />
          </>
        ) : (
          <>
            {/* drop-shadow row underneath each iris */}
            <rect x="8" y="10" width="2" height="1" fill={eyeShadow} opacity="0.55" />
            <rect x="14" y="10" width="2" height="1" fill={eyeShadow} opacity="0.55" />
            {/* irises */}
            <rect x="8" y="8" width="2" height="2" fill={eye} />
            <rect x="14" y="8" width="2" height="2" fill={eye} />
            {/* pure-white sparkles in upper-left of each eye */}
            <rect x="8" y="8" width="1" height="1" fill={sparkle} />
            <rect x="14" y="8" width="1" height="1" fill={sparkle} />
          </>
        )}
      </g>

      {/* ----- mouth ----- */}
      {isSuccess ? (
        <>
          <rect x="10" y="12" width="1" height="1" fill={mouth} />
          <rect x="13" y="12" width="1" height="1" fill={mouth} />
          <rect x="11" y="13" width="2" height="1" fill={mouth} />
        </>
      ) : isError ? (
        <>
          <rect x="11" y="12" width="2" height="1" fill={mouth} />
          <rect x="10" y="13" width="1" height="1" fill={mouth} />
          <rect x="13" y="13" width="1" height="1" fill={mouth} />
        </>
      ) : isSleep ? (
        <>
          <rect x="11" y="12" width="2" height="1" fill={mouth} opacity="0.35" />
          <rect x="11" y="13" width="2" height="1" fill={mouth} />
        </>
      ) : isWave ? (
        <>
          <rect x="10" y="12" width="4" height="1" fill={mouth} />
          <rect x="11" y="13" width="2" height="1" fill={mouth} />
        </>
      ) : (
        <rect x="11" y="13" width="2" height="1" fill={mouth} />
      )}

      {/* ----- cheek blush (kawaii) ----- */}
      <rect x="6" y="10" width="1" height="1" fill={blush} opacity="0.8" />
      <rect x="17" y="10" width="1" height="1" fill={blush} opacity="0.8" />
      <rect x="7" y="11" width="1" height="1" fill={blush} opacity="0.4" />
      <rect x="16" y="11" width="1" height="1" fill={blush} opacity="0.4" />
    </g>
  );
}

function Accessory({ state }: { state: WispState }) {
  // Carried at the "hand" — outside the body's right edge.
  switch (state) {
    case "sending":
      return (
        <g>
          {/* outline */}
          <rect x="19" y="9" width="5" height="1" fill="var(--color-navy)" />
          <rect x="19" y="10" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="9" width="1" height="3" fill="var(--color-navy)" />
          <rect x="22" y="12" width="1" height="1" fill="var(--color-navy)" />
          <rect x="21" y="13" width="1" height="1" fill="var(--color-navy)" />
          <rect x="20" y="14" width="3" height="1" fill="var(--color-navy)" />
          {/* fold body */}
          <rect x="20" y="10" width="3" height="2" fill="var(--color-cream)" />
          <rect x="20" y="12" width="2" height="1" fill="var(--color-cream)" />
          <rect x="20" y="13" width="1" height="1" fill="var(--color-cream)" />
          {/* center crease shadow */}
          <rect x="21" y="10" width="1" height="3" fill="var(--color-cream-200)" />
          {/* marigold thrust flash behind the plane */}
          <rect x="18" y="11" width="1" height="1" fill="var(--color-marigold)" />
          <rect x="17" y="12" width="1" height="1" fill="var(--color-marigold)" opacity="0.7" />
        </g>
      );
    case "linking":
      return (
        <g>
          {/* bow outline */}
          <rect x="18" y="9" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="13" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="10" width="1" height="3" fill="var(--color-navy)" />
          <rect x="21" y="10" width="1" height="3" fill="var(--color-navy)" />
          {/* pink bow */}
          <rect x="18" y="10" width="3" height="3" fill="var(--color-pink)" />
          {/* hole in the bow */}
          <rect x="19" y="11" width="1" height="1" fill="var(--color-cream)" />
          {/* shaft outline */}
          <rect x="21" y="11" width="3" height="1" fill="var(--color-navy)" />
          <rect x="22" y="12" width="2" height="1" fill="var(--color-navy)" />
          {/* shaft */}
          <rect x="22" y="11" width="2" height="1" fill="var(--color-pink)" />
          {/* teeth */}
          <rect x="23" y="12" width="1" height="1" fill="var(--color-pink)" />
        </g>
      );
    case "pinning":
      return (
        <g>
          {/* outline */}
          <rect x="18" y="9" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="14" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="10" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="10" width="1" height="4" fill="var(--color-navy)" />
          {/* body */}
          <rect x="19" y="10" width="4" height="4" fill="var(--color-purple)" />
          {/* perforation line down the middle */}
          <rect x="21" y="10" width="1" height="1" fill="var(--color-cream-200)" opacity="0.55" />
          <rect x="21" y="13" width="1" height="1" fill="var(--color-cream-200)" opacity="0.55" />
          {/* 4 pip numerals + marigold accent */}
          <rect x="19" y="11" width="1" height="1" fill="var(--color-cream)" />
          <rect x="20" y="11" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="11" width="1" height="1" fill="var(--color-cream)" />
          <rect x="19" y="12" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="12" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "pairing":
      return (
        <g>
          {/* mast */}
          <rect x="20" y="10" width="1" height="4" fill="var(--color-moss)" />
          {/* dish */}
          <rect x="19" y="9" width="3" height="1" fill="var(--color-moss)" />
          {/* base plate */}
          <rect x="19" y="13" width="3" height="1" fill="var(--color-moss)" />
          {/* outline */}
          <rect x="19" y="8" width="3" height="1" fill="var(--color-navy)" />
          <rect x="19" y="14" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="9" width="1" height="5" fill="var(--color-navy)" />
          <rect x="22" y="9" width="1" height="5" fill="var(--color-navy)" />
          {/* marigold tip blink */}
          <rect x="20" y="7" width="1" height="1" fill="var(--color-marigold)" />
          {/* signal arcs (one each side, fading) */}
          <rect x="16" y="10" width="1" height="1" fill="var(--color-moss)" opacity="0.75" />
          <rect x="15" y="9" width="1" height="1" fill="var(--color-moss)" opacity="0.45" />
          <rect x="23" y="10" width="1" height="1" fill="var(--color-moss)" opacity="0.75" />
        </g>
      );
    case "wave":
      // waving arm reaching up off the right shoulder
      return (
        <g>
          {/* arm outline */}
          <rect x="18" y="4" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="5" width="1" height="3" fill="var(--color-navy)" />
          <rect x="21" y="5" width="1" height="3" fill="var(--color-navy)" />
          <rect x="18" y="8" width="3" height="1" fill="var(--color-navy)" />
          {/* cream hand */}
          <rect x="18" y="5" width="3" height="3" fill="var(--color-cream)" />
          {/* finger creases */}
          <rect x="19" y="5" width="1" height="1" fill="var(--color-cream-200)" />
          <rect x="20" y="6" width="1" height="1" fill="var(--color-cream-200)" />
          {/* marigold motion sparks */}
          <rect x="22" y="3" width="1" height="1" fill="var(--color-marigold)" opacity="0.85" />
          <rect x="23" y="5" width="1" height="1" fill="var(--color-marigold)" opacity="0.6" />
        </g>
      );
    default:
      return null;
  }
}

function SleepZ() {
  return (
    <g fill="var(--color-purple)">
      {/* large Z */}
      <rect x="19" y="1" width="3" height="1" />
      <rect x="21" y="2" width="1" height="1" />
      <rect x="20" y="3" width="1" height="1" />
      <rect x="19" y="4" width="3" height="1" />
      {/* small Z drifting up-right */}
      <rect x="22" y="0" width="2" height="1" opacity="0.7" />
      <rect x="23" y="1" width="1" height="1" opacity="0.7" />
      <rect x="22" y="2" width="2" height="1" opacity="0.7" />
    </g>
  );
}
