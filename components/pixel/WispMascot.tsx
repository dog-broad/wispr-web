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
// Iteration 2 changes from the previous oval:
//
//   1. The head + chest stay 14 px wide for 8 rows so the upper body
//      reads as one chunky block instead of tapering smoothly into the
//      tail (the old shape read as an egg).
//   2. The lower body narrows fast — 14 → 12 → 8 → 6 over three rows
//      — giving the spirit a defined waist before the tail.
//   3. The wisp-tail keeps width (5–6 px) for three rows, drifts to the
//      right, and ends BLUNT at three pixels wide. No needle point.
//
// Pixel anatomy (in viewBox units):
//   - dome cap:   y=1     cream 10 wide (cols 7..16)
//   - chest:     y=2..9  cream 14 wide (cols 5..18)
//   - waist:     y=10..12 cream narrows 12 → 8 → 6
//   - tail body: y=13..15 cream 6 → 5 → 5 with right shift
//   - tail tip:  y=16..18 cream 4 → 3 → 3 (blunt)
//   - eyes:      (8,5)..(9,6) and (14,5)..(15,6)
//   - mouth:     (10..13, 8..9), state-dependent
//   - blush:     (6,7) + (17,7), softer at (7,8) + (16,8)
//   - shine:     soft cream-50 at (9,3) and (8,4)
//   - accessory: cols 17..23, rows 4..13 depending on the prop
//   - sleep Z:   cols 19..23, rows 0..4 (top-right corner)

type Row = readonly [y: number, x0: number, x1: number];

const CREAM_ROWS: readonly Row[] = [
  [1, 7, 16], // dome cap (10 wide)
  // chest — chunky 14-wide trunk, 8 rows tall
  [2, 5, 18],
  [3, 5, 18],
  [4, 5, 18],
  [5, 5, 18], // eyes top
  [6, 5, 18], // eyes bottom
  [7, 5, 18], // drop-shadow row + blush
  [8, 5, 18], // mouth top
  [9, 5, 18], // mouth bottom
  // sharp narrow into waist
  [10, 6, 17], // 12
  [11, 8, 15], // 8
  [12, 9, 14], // 6 — waist
  // tail body, keeps volume + drifts right
  [13, 9, 14], // 6
  [14, 10, 14], // 5 — slight right drift
  [15, 11, 15], // 5
  // tail tip, blunt
  [16, 12, 15], // 4
  [17, 13, 15], // 3
  [18, 13, 15], // 3 — BLUNT END (no needle point)
];

// Pixels the wider-silhouette pass doesn't cover: top cap, two shoulders
// at row 1 (head expands by 2 px on each side row 1→row 2), two shoulders
// at row 11 (body narrows by 2 px each side row 10→row 11), and the
// 3-px bottom outline beneath the blunt tail tip.
const NAVY_EXTRAS: readonly { x: number; y: number; w?: number }[] = [
  { x: 7, y: 0, w: 10 }, // top cap
  { x: 5, y: 1 }, // left shoulder of head widening
  { x: 18, y: 1 }, // right shoulder
  { x: 6, y: 11 }, // left shoulder of waist narrow
  { x: 17, y: 11 }, // right shoulder of waist narrow
  { x: 13, y: 19, w: 3 }, // blunt-tail bottom outline
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
      {/* ----- navy outline: cream silhouette grown by 1 px ----- */}
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

      {/* forehead shine */}
      <rect x="9" y="3" width="1" height="1" fill={creamShine} />
      <rect x="8" y="4" width="1" height="1" fill={creamShine} />

      {/* ----- eyes ----- */}
      <g className={animate ? "anim-wisp-blink" : ""}>
        {isSleep ? (
          // closed kawaii arcs ‿ ‿ — 4 px each: top middle + bottom corners
          <>
            <rect x="8" y="5" width="2" height="1" fill={navy} />
            <rect x="7" y="6" width="1" height="1" fill={navy} />
            <rect x="10" y="6" width="1" height="1" fill={navy} />
            <rect x="14" y="5" width="2" height="1" fill={navy} />
            <rect x="13" y="6" width="1" height="1" fill={navy} />
            <rect x="16" y="6" width="1" height="1" fill={navy} />
          </>
        ) : (
          <>
            {/* drop-shadow row below each iris */}
            <rect x="8" y="7" width="2" height="1" fill={eyeShadow} opacity="0.55" />
            <rect x="14" y="7" width="2" height="1" fill={eyeShadow} opacity="0.55" />
            {/* irises */}
            <rect x="8" y="5" width="2" height="2" fill={eye} />
            <rect x="14" y="5" width="2" height="2" fill={eye} />
            {/* pure-white sparkles, upper-left of each eye */}
            <rect x="8" y="5" width="1" height="1" fill={sparkle} />
            <rect x="14" y="5" width="1" height="1" fill={sparkle} />
          </>
        )}
      </g>

      {/* ----- mouth (state-dependent) ----- */}
      {isSuccess ? (
        <>
          <rect x="10" y="8" width="1" height="1" fill={mouth} />
          <rect x="13" y="8" width="1" height="1" fill={mouth} />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      ) : isError ? (
        <>
          <rect x="11" y="8" width="2" height="1" fill={mouth} />
          <rect x="10" y="9" width="1" height="1" fill={mouth} />
          <rect x="13" y="9" width="1" height="1" fill={mouth} />
        </>
      ) : isSleep ? (
        <>
          <rect x="11" y="8" width="2" height="1" fill={mouth} opacity="0.35" />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      ) : isWave ? (
        <>
          <rect x="10" y="8" width="4" height="1" fill={mouth} />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      ) : (
        <rect x="11" y="9" width="2" height="1" fill={mouth} />
      )}

      {/* ----- cheek blush ----- */}
      <rect x="6" y="7" width="1" height="1" fill={blush} opacity="0.8" />
      <rect x="17" y="7" width="1" height="1" fill={blush} opacity="0.8" />
      <rect x="7" y="8" width="1" height="1" fill={blush} opacity="0.4" />
      <rect x="16" y="8" width="1" height="1" fill={blush} opacity="0.4" />
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
          <rect x="19" y="6" width="5" height="1" fill="var(--color-navy)" />
          <rect x="19" y="7" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="6" width="1" height="3" fill="var(--color-navy)" />
          <rect x="22" y="9" width="1" height="1" fill="var(--color-navy)" />
          <rect x="21" y="10" width="1" height="1" fill="var(--color-navy)" />
          <rect x="20" y="11" width="3" height="1" fill="var(--color-navy)" />
          {/* fold body */}
          <rect x="20" y="7" width="3" height="2" fill="var(--color-cream)" />
          <rect x="20" y="9" width="2" height="1" fill="var(--color-cream)" />
          <rect x="20" y="10" width="1" height="1" fill="var(--color-cream)" />
          {/* center crease */}
          <rect x="21" y="7" width="1" height="3" fill="var(--color-cream-200)" />
          {/* marigold thrust flash behind */}
          <rect x="18" y="8" width="1" height="1" fill="var(--color-marigold)" />
          <rect x="17" y="9" width="1" height="1" fill="var(--color-marigold)" opacity="0.7" />
        </g>
      );
    case "linking":
      return (
        <g>
          {/* bow outline */}
          <rect x="18" y="6" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="10" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="7" width="1" height="3" fill="var(--color-navy)" />
          <rect x="21" y="7" width="1" height="3" fill="var(--color-navy)" />
          {/* pink bow */}
          <rect x="18" y="7" width="3" height="3" fill="var(--color-pink)" />
          {/* hole */}
          <rect x="19" y="8" width="1" height="1" fill="var(--color-cream)" />
          {/* shaft outline */}
          <rect x="21" y="8" width="3" height="1" fill="var(--color-navy)" />
          <rect x="22" y="9" width="2" height="1" fill="var(--color-navy)" />
          {/* shaft */}
          <rect x="22" y="8" width="2" height="1" fill="var(--color-pink)" />
          {/* tooth */}
          <rect x="23" y="9" width="1" height="1" fill="var(--color-pink)" />
        </g>
      );
    case "pinning":
      return (
        <g>
          {/* outline */}
          <rect x="18" y="6" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="11" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="7" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="7" width="1" height="4" fill="var(--color-navy)" />
          {/* body */}
          <rect x="19" y="7" width="4" height="4" fill="var(--color-purple)" />
          {/* perforation */}
          <rect x="21" y="7" width="1" height="1" fill="var(--color-cream-200)" opacity="0.55" />
          <rect x="21" y="10" width="1" height="1" fill="var(--color-cream-200)" opacity="0.55" />
          {/* 4 pip numerals */}
          <rect x="19" y="8" width="1" height="1" fill="var(--color-cream)" />
          <rect x="20" y="8" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="8" width="1" height="1" fill="var(--color-cream)" />
          <rect x="19" y="9" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="9" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "pairing":
      return (
        <g>
          {/* mast */}
          <rect x="20" y="7" width="1" height="4" fill="var(--color-moss)" />
          {/* dish */}
          <rect x="19" y="6" width="3" height="1" fill="var(--color-moss)" />
          {/* base plate */}
          <rect x="19" y="10" width="3" height="1" fill="var(--color-moss)" />
          {/* outline */}
          <rect x="19" y="5" width="3" height="1" fill="var(--color-navy)" />
          <rect x="19" y="11" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="6" width="1" height="5" fill="var(--color-navy)" />
          <rect x="22" y="6" width="1" height="5" fill="var(--color-navy)" />
          {/* marigold tip blink */}
          <rect x="20" y="4" width="1" height="1" fill="var(--color-marigold)" />
          {/* signal arcs */}
          <rect x="16" y="7" width="1" height="1" fill="var(--color-moss)" opacity="0.75" />
          <rect x="15" y="6" width="1" height="1" fill="var(--color-moss)" opacity="0.45" />
          <rect x="23" y="7" width="1" height="1" fill="var(--color-moss)" opacity="0.75" />
        </g>
      );
    case "wave":
      return (
        <g>
          {/* arm outline */}
          <rect x="18" y="1" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="2" width="1" height="3" fill="var(--color-navy)" />
          <rect x="21" y="2" width="1" height="3" fill="var(--color-navy)" />
          <rect x="18" y="5" width="3" height="1" fill="var(--color-navy)" />
          {/* cream hand */}
          <rect x="18" y="2" width="3" height="3" fill="var(--color-cream)" />
          {/* finger creases */}
          <rect x="19" y="2" width="1" height="1" fill="var(--color-cream-200)" />
          <rect x="20" y="3" width="1" height="1" fill="var(--color-cream-200)" />
          {/* marigold motion sparks */}
          <rect x="22" y="0" width="1" height="1" fill="var(--color-marigold)" opacity="0.85" />
          <rect x="23" y="2" width="1" height="1" fill="var(--color-marigold)" opacity="0.6" />
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
