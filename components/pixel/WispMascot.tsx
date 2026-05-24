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

// The Wisp — a kawaii sheet-ghost on a 24×24 grid.
//
// Design language follows the classic kawaii ghost silhouette:
//
//   1. Balloon-rounded head with a chunky 16-wide chest
//   2. Two small arm-nubs poking out the sides at "shoulder" height
//   3. A wavy three-hump scalloped skirt at the bottom (no tail)
//   4. 4×4 navy irises with a 2×2 white sparkle in the upper-left and a
//      1×1 white sparkle in the lower-right — the big-anime-eye look
//   5. Prominent 2×2 pink blush ovals on the cheeks
//   6. A tiny u-smile mouth, navy
//
// Pixel anatomy (viewBox units):
//   - dome cap:    y=1     cream 8 wide   (cols 8..15)
//   - upper head:  y=2..3  cream widens 12 → 14
//   - face:        y=4..9  cream 16 wide  (cols 4..19)
//   - arms:        y=10..11 cream 20 wide (cols 2..21) — nubs +1 each side
//   - body:        y=12..15 cream 16 wide (cols 4..19)
//   - scallops:    y=16..17 three humps with droplet tips
//   - eyes:        4×4 navy irises at (6,4) and (14,4)
//                  - big sparkle 2×2 at upper-left, small 1×1 lower-right
//   - mouth:       cols 10..13, rows 8..9 (state-dependent)
//   - blush:       2×2 at cols 5..6 and 17..18, rows 8..9
//   - shine:       cream-50 highlights at (9,3) and (8,4)
//   - accessory:   floats upper-right around cols 19..23, rows 0..7
//   - sleep Z:     cols 19..23, rows 0..4

type Row = readonly [y: number, x0: number, x1: number];

const CREAM_ROWS: readonly Row[] = [
  // dome cap, head widens
  [1, 8, 15], // (8)
  [2, 6, 17], // (12)
  [3, 5, 18], // (14)
  // face — chunky 16-wide
  [4, 4, 19], // eyes top
  [5, 4, 19],
  [6, 4, 19],
  [7, 4, 19], // eyes bottom
  [8, 4, 19], // blush + mouth top
  [9, 4, 19], // blush + mouth bottom
  // arms protrude — 20 wide
  [10, 2, 21],
  [11, 2, 21],
  // body — back to 16 wide
  [12, 4, 19],
  [13, 4, 19],
  [14, 4, 19],
  [15, 4, 19],
  // scalloped skirt, three humps
  [16, 4, 7],
  [16, 10, 13],
  [16, 16, 19],
  // droplet tips
  [17, 5, 6],
  [17, 11, 12],
  [17, 17, 18],
];

// Pixels the wider-silhouette pass can't cover: top cap, shoulders
// where the silhouette widens or narrows by more than 1 px per row,
// arm corners, and the bottom outline beneath each droplet tip.
const NAVY_EXTRAS: readonly { x: number; y: number; w?: number }[] = [
  { x: 8, y: 0, w: 8 }, // top cap
  { x: 6, y: 1 }, // left shoulder of head widening
  { x: 17, y: 1 }, // right shoulder
  { x: 4, y: 2 }, // left shoulder cont.
  { x: 19, y: 2 }, // right shoulder cont.
  { x: 2, y: 9 }, // left arm shoulder (body→arm)
  { x: 21, y: 9 }, // right arm shoulder
  { x: 2, y: 12 }, // left arm bottom shoulder
  { x: 21, y: 12 }, // right arm bottom shoulder
  // bottom outlines under droplet tips
  { x: 5, y: 18, w: 2 },
  { x: 11, y: 18, w: 2 },
  { x: 17, y: 18, w: 2 },
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
  const creamShade = "var(--color-cream-200)";
  const sparkle = "#ffffff";
  const navy = "var(--color-navy)";
  const blush = "var(--color-pink)";
  // Kawaii eyes stay navy across all states — expression is carried by
  // the mouth, like the reference. Sleeping still draws closed arcs.
  const iris = navy;
  const mouth = isError ? "var(--color-pink)" : navy;

  return (
    <g>
      {/* ----- navy outline ----- */}
      {CREAM_ROWS.map(([y, a, b], idx) => (
        <rect
          key={`n-${idx}`}
          x={a - 1}
          y={y}
          width={b - a + 3}
          height="1"
          fill={navy}
        />
      ))}
      {NAVY_EXTRAS.map(({ x, y, w = 1 }, idx) => (
        <rect key={`nx-${idx}`} x={x} y={y} width={w} height="1" fill={navy} />
      ))}

      {/* ----- cream interior ----- */}
      {CREAM_ROWS.map(([y, a, b], idx) => (
        <rect
          key={`c-${idx}`}
          x={a}
          y={y}
          width={b - a + 1}
          height="1"
          fill={cream}
        />
      ))}

      {/* subtle side shading down the right edge for sheet-ghost depth */}
      <rect x="17" y="4" width="1" height="6" fill={creamShade} opacity="0.7" />
      <rect x="18" y="3" width="1" height="12" fill={creamShade} opacity="0.6" />
      <rect x="18" y="15" width="1" height="1" fill={creamShade} opacity="0.6" />
      <rect x="17" y="16" width="1" height="1" fill={creamShade} opacity="0.6" />
      <rect x="18" y="16" width="1" height="1" fill={creamShade} opacity="0.6" />

      {/* forehead shine */}
      <rect x="9" y="3" width="1" height="1" fill={creamShine} />
      <rect x="8" y="4" width="1" height="1" fill={creamShine} />
      <rect x="10" y="3" width="1" height="1" fill={creamShine} opacity="0.7" />

      {/* ----- eyes ----- */}
      <g className={animate ? "anim-wisp-blink" : ""}>
        {isSleep ? (
          // closed kawaii arcs ‿ ‿ — 4 px per eye
          <>
            <rect x="6" y="5" width="2" height="1" fill={navy} />
            <rect x="5" y="6" width="1" height="1" fill={navy} />
            <rect x="8" y="6" width="1" height="1" fill={navy} />
            <rect x="15" y="5" width="2" height="1" fill={navy} />
            <rect x="14" y="6" width="1" height="1" fill={navy} />
            <rect x="17" y="6" width="1" height="1" fill={navy} />
          </>
        ) : (
          <>
            {/* left iris 4x4 */}
            <rect x="5" y="4" width="4" height="4" fill={iris} />
            {/* right iris 4x4 */}
            <rect x="14" y="4" width="4" height="4" fill={iris} />
            {/* big white sparkles, 2x2 in upper-left of each iris */}
            <rect x="5" y="4" width="2" height="2" fill={sparkle} />
            <rect x="14" y="4" width="2" height="2" fill={sparkle} />
            {/* small white sparkles, 1x1 in lower-right of each iris */}
            <rect x="8" y="7" width="1" height="1" fill={sparkle} />
            <rect x="17" y="7" width="1" height="1" fill={sparkle} />
          </>
        )}
      </g>

      {/* ----- mouth ----- */}
      {isSuccess ? (
        // big closed smile, corners up
        <>
          <rect x="10" y="8" width="1" height="1" fill={mouth} />
          <rect x="13" y="8" width="1" height="1" fill={mouth} />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      ) : isError ? (
        // worried frown
        <>
          <rect x="11" y="8" width="2" height="1" fill={mouth} />
          <rect x="10" y="9" width="1" height="1" fill={mouth} />
          <rect x="13" y="9" width="1" height="1" fill={mouth} />
        </>
      ) : isSleep ? (
        // small open snore o
        <>
          <rect x="11" y="8" width="2" height="1" fill={mouth} opacity="0.4" />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      ) : isWave ? (
        // open grin
        <>
          <rect x="10" y="8" width="4" height="1" fill={mouth} />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      ) : (
        // default tiny kawaii u-smile
        <>
          <rect x="10" y="8" width="1" height="1" fill={mouth} />
          <rect x="13" y="8" width="1" height="1" fill={mouth} />
          <rect x="11" y="9" width="2" height="1" fill={mouth} />
        </>
      )}

      {/* ----- pink blush, 2x2 ovals on the cheeks ----- */}
      <rect x="5" y="8" width="2" height="2" fill={blush} opacity="0.78" />
      <rect x="17" y="8" width="2" height="2" fill={blush} opacity="0.78" />
      {/* slightly brighter center pixel for kawaii sheen */}
      <rect x="5" y="8" width="1" height="1" fill={blush} opacity="0.9" />
      <rect x="17" y="8" width="1" height="1" fill={blush} opacity="0.9" />
    </g>
  );
}

function Accessory({ state }: { state: WispState }) {
  // Floats above the right shoulder. Arms are already part of the
  // silhouette, so we don't draw a separate "hand" for held items —
  // the accessory reads as the ghost's thought / current action.
  switch (state) {
    case "sending":
      return (
        <g>
          {/* paper plane outline */}
          <rect x="19" y="2" width="5" height="1" fill="var(--color-navy)" />
          <rect x="19" y="3" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="2" width="1" height="3" fill="var(--color-navy)" />
          <rect x="22" y="5" width="1" height="1" fill="var(--color-navy)" />
          <rect x="21" y="6" width="1" height="1" fill="var(--color-navy)" />
          <rect x="20" y="7" width="3" height="1" fill="var(--color-navy)" />
          {/* paper body */}
          <rect x="20" y="3" width="3" height="2" fill="var(--color-cream)" />
          <rect x="20" y="5" width="2" height="1" fill="var(--color-cream)" />
          <rect x="20" y="6" width="1" height="1" fill="var(--color-cream)" />
          {/* center crease */}
          <rect x="21" y="3" width="1" height="3" fill="var(--color-cream-200)" />
          {/* marigold thrust flash */}
          <rect x="18" y="4" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "linking":
      return (
        <g>
          {/* bow outline */}
          <rect x="18" y="2" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="6" width="3" height="1" fill="var(--color-navy)" />
          <rect x="17" y="3" width="1" height="3" fill="var(--color-navy)" />
          <rect x="21" y="3" width="1" height="3" fill="var(--color-navy)" />
          {/* pink bow */}
          <rect x="18" y="3" width="3" height="3" fill="var(--color-pink)" />
          {/* hole */}
          <rect x="19" y="4" width="1" height="1" fill="var(--color-cream)" />
          {/* shaft outline */}
          <rect x="21" y="4" width="3" height="1" fill="var(--color-navy)" />
          <rect x="22" y="5" width="2" height="1" fill="var(--color-navy)" />
          {/* shaft */}
          <rect x="22" y="4" width="2" height="1" fill="var(--color-pink)" />
          {/* tooth */}
          <rect x="23" y="5" width="1" height="1" fill="var(--color-pink)" />
        </g>
      );
    case "pinning":
      return (
        <g>
          {/* outline */}
          <rect x="18" y="2" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="7" width="6" height="1" fill="var(--color-navy)" />
          <rect x="18" y="3" width="1" height="4" fill="var(--color-navy)" />
          <rect x="23" y="3" width="1" height="4" fill="var(--color-navy)" />
          {/* body */}
          <rect x="19" y="3" width="4" height="4" fill="var(--color-purple)" />
          {/* perforation */}
          <rect x="21" y="3" width="1" height="1" fill="var(--color-cream-200)" opacity="0.55" />
          <rect x="21" y="6" width="1" height="1" fill="var(--color-cream-200)" opacity="0.55" />
          {/* 4 pip numerals */}
          <rect x="19" y="4" width="1" height="1" fill="var(--color-cream)" />
          <rect x="20" y="4" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="4" width="1" height="1" fill="var(--color-cream)" />
          <rect x="19" y="5" width="1" height="1" fill="var(--color-cream)" />
          <rect x="22" y="5" width="1" height="1" fill="var(--color-marigold)" />
        </g>
      );
    case "pairing":
      return (
        <g>
          {/* mast */}
          <rect x="20" y="3" width="1" height="4" fill="var(--color-moss)" />
          {/* dish */}
          <rect x="19" y="2" width="3" height="1" fill="var(--color-moss)" />
          {/* base plate */}
          <rect x="19" y="6" width="3" height="1" fill="var(--color-moss)" />
          {/* outline */}
          <rect x="19" y="1" width="3" height="1" fill="var(--color-navy)" />
          <rect x="19" y="7" width="3" height="1" fill="var(--color-navy)" />
          <rect x="18" y="2" width="1" height="5" fill="var(--color-navy)" />
          <rect x="22" y="2" width="1" height="5" fill="var(--color-navy)" />
          {/* marigold tip blink */}
          <rect x="20" y="0" width="1" height="1" fill="var(--color-marigold)" />
          {/* signal arcs */}
          <rect x="16" y="3" width="1" height="1" fill="var(--color-moss)" opacity="0.75" />
          <rect x="15" y="2" width="1" height="1" fill="var(--color-moss)" opacity="0.45" />
          <rect x="23" y="3" width="1" height="1" fill="var(--color-moss)" opacity="0.75" />
        </g>
      );
    case "wave":
      // Both arm-nubs stay in the silhouette; the right one gets motion
      // sparks above it to read as "waving."
      return (
        <g>
          <rect x="21" y="8" width="1" height="1" fill="var(--color-marigold)" opacity="0.9" />
          <rect x="22" y="9" width="1" height="1" fill="var(--color-marigold)" opacity="0.7" />
          <rect x="22" y="7" width="1" height="1" fill="var(--color-marigold)" opacity="0.5" />
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
