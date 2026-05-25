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
  /** Pixel scale. Final width = 32 * size. Default 3 -> 96 px square. */
  size?: number;
  className?: string;
  /** Animate idle bob, blink, sparkle drift, and per-state accessory motion. */
  animate?: boolean;
}

// The Wisp — a kawaii sheet-ghost on a 32×32 grid.
//
// Pixel anatomy (viewBox units):
//   - dome cap:    y=0     navy 8 wide   (cols 12..19)
//   - upper head:  y=1..7  cream widens 8 → 24
//   - face:        y=8..15 cream 24 wide
//   - eyes:        5×5 navy irises at (7,8) and (20,8) with 2×2 + 1×1 sparkles
//   - blush:       2×2 pink at (4,11) and (26,11)
//   - mouth:       cols 13..18, rows 13..14 (state-dependent)
//   - arms:        y=16..17 cream 28 wide (cols 2..29)
//   - body:        y=18..24 cream 24 wide
//   - scallops:    y=25..27 four humps with 1-px droplet tips
//   - accessory:   floats cols 21..31, rows 1..14 (drawn over silhouette)
//   - sleep Z:     cols 20..28, rows 0..7

type Row = readonly [y: number, x0: number, x1: number];

const CREAM_ROWS: readonly Row[] = [
  // dome — widens from 8 to 24 over 7 rows
  [1, 12, 19], // 8
  [2, 10, 21], // 12 (+2 each side, needs shoulder extras)
  [3, 9, 22], // 14
  [4, 8, 23], // 16
  [5, 7, 24], // 18
  [6, 6, 25], // 20
  [7, 5, 26], // 22
  // face — 24 wide
  [8, 4, 27],
  [9, 4, 27],
  [10, 4, 27],
  [11, 4, 27],
  [12, 4, 27],
  [13, 4, 27],
  [14, 4, 27],
  [15, 4, 27],
  // arms — 28 wide
  [16, 2, 29],
  [17, 2, 29],
  // body — back to 24 wide
  [18, 4, 27],
  [19, 4, 27],
  [20, 4, 27],
  [21, 4, 27],
  [22, 4, 27],
  [23, 4, 27],
  [24, 4, 27],
  // four scallop humps
  [25, 5, 8],
  [25, 11, 14],
  [25, 17, 20],
  [25, 23, 26],
  // droplet middles (2 wide)
  [26, 6, 7],
  [26, 12, 13],
  [26, 18, 19],
  [26, 24, 25],
  // droplet tips (1 wide)
  [27, 6, 6],
  [27, 12, 12],
  [27, 18, 18],
  [27, 24, 24],
];

// Pixels the cream-edge outline trick can't cover by itself:
//   - the navy cap above row-1 cream
//   - shoulder bridges where the silhouette widens by >1 px per row
//   - the rounded caps that close each droplet underneath
const NAVY_EXTRAS: readonly { x: number; y: number; w?: number }[] = [
  // top navy cap above row-1 cream
  { x: 12, y: 0, w: 8 },
  // row 1 → row 2 widen +2 each side
  { x: 10, y: 1 },
  { x: 21, y: 1 },
  // row 15 → row 16 arm flare +2 each side
  { x: 2, y: 15 },
  { x: 29, y: 15 },
  // row 17 → row 18 arm narrow -2 each side
  { x: 2, y: 18 },
  { x: 29, y: 18 },
  // droplet bottom caps
  { x: 5, y: 28, w: 3 },
  { x: 11, y: 28, w: 3 },
  { x: 17, y: 28, w: 3 },
  { x: 23, y: 28, w: 3 },
];

export function WispMascot({
  state = "idle",
  size = 3,
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
      style={{ width: 32 * size, height: 32 * size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        width={32 * size}
        height={32 * size}
        shapeRendering="crispEdges"
      >
        <Body state={state} animate={animate} />
        <Accessory state={state} animate={animate} />
        {state === "sleeping" && <SleepZ animate={animate} />}
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
  // Kawaii eyes stay navy across all states — expression carried by the
  // mouth (and by the per-state accessory motion).
  const iris = navy;
  const mouth = isError ? "var(--color-pink)" : navy;

  return (
    <g>
      {/* ----- navy outline (1-px halo around each cream row) ----- */}
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

      {/* subtle right-side shading for sheet-ghost depth */}
      <rect x="22" y="3" width="1" height="4" fill={creamShade} opacity="0.55" />
      <rect x="23" y="5" width="1" height="11" fill={creamShade} opacity="0.5" />
      <rect x="24" y="8" width="1" height="16" fill={creamShade} opacity="0.4" />
      <rect x="23" y="18" width="1" height="6" fill={creamShade} opacity="0.5" />

      {/* forehead shine */}
      <rect x="11" y="3" width="1" height="1" fill={creamShine} />
      <rect x="10" y="4" width="1" height="1" fill={creamShine} />
      <rect x="12" y="2" width="1" height="1" fill={creamShine} opacity="0.7" />

      {/* ----- eyes (5x5 irises) ----- */}
      <g
        className={animate ? "anim-wisp-blink" : ""}
        style={{ transformOrigin: "16px 10px" }}
      >
        {isSleep ? (
          // closed kawaii arcs ‿ ‿
          <>
            <rect x="7" y="9" width="3" height="1" fill={navy} />
            <rect x="6" y="10" width="1" height="1" fill={navy} />
            <rect x="10" y="10" width="1" height="1" fill={navy} />
            <rect x="20" y="9" width="3" height="1" fill={navy} />
            <rect x="19" y="10" width="1" height="1" fill={navy} />
            <rect x="23" y="10" width="1" height="1" fill={navy} />
          </>
        ) : (
          <>
            {/* left iris 5x5 */}
            <rect x="7" y="8" width="5" height="5" fill={iris} />
            {/* right iris 5x5 */}
            <rect x="20" y="8" width="5" height="5" fill={iris} />
            {/* sparkles — grouped so they can drift together */}
            <g
              className={animate ? "anim-wisp-sparkle" : ""}
              style={{ transformOrigin: "16px 10px" }}
            >
              {/* big white sparkle 2x2 upper-left of each iris */}
              <rect x="7" y="8" width="2" height="2" fill={sparkle} />
              <rect x="20" y="8" width="2" height="2" fill={sparkle} />
              {/* tiny 1x1 sparkle lower-right of each iris */}
              <rect x="11" y="12" width="1" height="1" fill={sparkle} />
              <rect x="24" y="12" width="1" height="1" fill={sparkle} />
            </g>
          </>
        )}
      </g>

      {/* ----- mouth ----- */}
      {isSuccess ? (
        // big closed smile, corners up
        <>
          <rect x="13" y="13" width="1" height="1" fill={mouth} />
          <rect x="18" y="13" width="1" height="1" fill={mouth} />
          <rect x="14" y="14" width="4" height="1" fill={mouth} />
        </>
      ) : isError ? (
        // worried frown
        <>
          <rect x="14" y="13" width="4" height="1" fill={mouth} />
          <rect x="13" y="14" width="1" height="1" fill={mouth} />
          <rect x="18" y="14" width="1" height="1" fill={mouth} />
        </>
      ) : isSleep ? (
        // small open snore o
        <>
          <rect x="15" y="13" width="2" height="1" fill={mouth} opacity="0.4" />
          <rect x="15" y="14" width="2" height="1" fill={mouth} />
        </>
      ) : isWave ? (
        // open grin
        <>
          <rect x="13" y="13" width="6" height="1" fill={mouth} />
          <rect x="14" y="14" width="4" height="1" fill={mouth} />
        </>
      ) : (
        // default tiny kawaii u-smile
        <>
          <rect x="13" y="13" width="1" height="1" fill={mouth} />
          <rect x="18" y="13" width="1" height="1" fill={mouth} />
          <rect x="14" y="14" width="4" height="1" fill={mouth} />
        </>
      )}

      {/* ----- pink blush, 2x2 ovals at the cheeks ----- */}
      <rect x="4" y="11" width="2" height="2" fill={blush} opacity="0.78" />
      <rect x="26" y="11" width="2" height="2" fill={blush} opacity="0.78" />
      {/* brighter center pixel for kawaii sheen */}
      <rect x="4" y="11" width="1" height="1" fill={blush} opacity="0.95" />
      <rect x="26" y="11" width="1" height="1" fill={blush} opacity="0.95" />
    </g>
  );
}

function Accessory({
  state,
  animate,
}: {
  state: WispState;
  animate: boolean;
}) {
  switch (state) {
    case "sending":
      return <SendingAccessory animate={animate} />;
    case "linking":
      return <LinkingAccessory animate={animate} />;
    case "pinning":
      return <PinningAccessory animate={animate} />;
    case "pairing":
      return <PairingAccessory animate={animate} />;
    case "wave":
      return <WaveAccessory animate={animate} />;
    default:
      return null;
  }
}

// --- accessory sprites --------------------------------------------------

function SendingAccessory({ animate }: { animate: boolean }) {
  // Paper plane (8 wide × 7 tall) anchored at cols 22..29, rows 2..8.
  // Travels diagonally up-right on a 600ms loop; marigold motion lines
  // sit behind it and pulse on the same beat.
  const navy = "var(--color-navy)";
  const cream = "var(--color-cream)";
  const shade = "var(--color-cream-200)";
  const flash = "var(--color-marigold)";
  return (
    <g>
      {/* marigold motion chevrons (animate opacity in/out) */}
      <g className={animate ? "anim-wisp-thrust" : ""}>
        <rect x="20" y="5" width="2" height="1" fill={flash} />
        <rect x="19" y="6" width="1" height="1" fill={flash} opacity="0.7" />
        <rect x="19" y="3" width="1" height="1" fill={flash} opacity="0.55" />
        <rect x="17" y="5" width="1" height="1" fill={flash} opacity="0.45" />
      </g>
      {/* plane (translates on the same loop) */}
      <g className={animate ? "anim-wisp-plane" : ""}>
        {/* outline */}
        <rect x="28" y="1" width="1" height="1" fill={navy} />
        <rect x="27" y="2" width="2" height="1" fill={navy} />
        <rect x="26" y="3" width="3" height="1" fill={navy} />
        <rect x="25" y="4" width="4" height="1" fill={navy} />
        <rect x="22" y="5" width="7" height="1" fill={navy} />
        <rect x="23" y="6" width="1" height="1" fill={navy} />
        <rect x="25" y="6" width="3" height="1" fill={navy} />
        <rect x="24" y="7" width="3" height="1" fill={navy} />
        {/* cream body */}
        <rect x="28" y="3" width="1" height="2" fill={cream} />
        <rect x="27" y="4" width="1" height="1" fill={cream} />
        <rect x="24" y="6" width="1" height="1" fill={cream} />
        <rect x="25" y="5" width="2" height="1" fill={cream} />
        {/* shaded fold along the center crease */}
        <rect x="26" y="4" width="1" height="1" fill={shade} />
        <rect x="26" y="6" width="1" height="1" fill={shade} />
      </g>
    </g>
  );
}

function LinkingAccessory({ animate }: { animate: boolean }) {
  // Two interlocked chain links (each ~5 wide, side-by-side; combined
  // sprite 9 wide × 6 tall) above the right shoulder. Wiggles back and
  // forth slowly to suggest "link, share."
  const navy = "var(--color-navy)";
  const pink = "var(--color-pink)";
  return (
    <g
      className={animate ? "anim-wisp-link" : ""}
      style={{ transformOrigin: "24px 4px" }}
    >
      {/* left link outline */}
      <rect x="20" y="3" width="4" height="1" fill={navy} />
      <rect x="20" y="6" width="4" height="1" fill={navy} />
      <rect x="19" y="4" width="1" height="2" fill={navy} />
      <rect x="23" y="4" width="1" height="2" fill={navy} />
      {/* left link interior */}
      <rect x="20" y="4" width="3" height="2" fill={pink} />
      {/* hole punched in the middle */}
      <rect x="21" y="4" width="1" height="2" fill="var(--color-cream)" />
      {/* right link outline (offset so they interlock) */}
      <rect x="24" y="2" width="4" height="1" fill={navy} />
      <rect x="24" y="5" width="4" height="1" fill={navy} />
      <rect x="23" y="3" width="1" height="2" fill={navy} />
      <rect x="28" y="3" width="1" height="2" fill={navy} />
      {/* right link interior */}
      <rect x="24" y="3" width="4" height="2" fill={pink} />
      {/* hole */}
      <rect x="26" y="3" width="1" height="2" fill="var(--color-cream)" />
      {/* interlock crossover — re-stroke the seam so the rings read connected */}
      <rect x="23" y="4" width="1" height="2" fill={navy} />
    </g>
  );
}

function PinningAccessory({ animate }: { animate: boolean }) {
  // Three pips on a purple tab. Each pip brightens in turn on a 3-step
  // animation so the strip reads as "PIN code being entered."
  // Anchored at rows 1..7 to clear the right iris (rows 8..12).
  const navy = "var(--color-navy)";
  const purple = "var(--color-purple)";
  const cream = "var(--color-cream)";
  return (
    <g>
      {/* outline */}
      <rect x="20" y="1" width="10" height="1" fill={navy} />
      <rect x="20" y="7" width="10" height="1" fill={navy} />
      <rect x="19" y="2" width="1" height="5" fill={navy} />
      <rect x="30" y="2" width="1" height="5" fill={navy} />
      {/* purple body */}
      <rect x="20" y="2" width="10" height="5" fill={purple} />
      {/* perforation notches top + bottom */}
      <rect x="24" y="1" width="1" height="1" fill={cream} opacity="0.6" />
      <rect x="27" y="1" width="1" height="1" fill={cream} opacity="0.6" />
      <rect x="24" y="7" width="1" height="1" fill={cream} opacity="0.6" />
      <rect x="27" y="7" width="1" height="1" fill={cream} opacity="0.6" />
      {/* three pips — staggered brightening via nth-of-type CSS */}
      <g className={animate ? "anim-wisp-pin" : ""}>
        <rect x="21" y="3" width="2" height="2" fill={cream} />
        <rect x="24" y="3" width="2" height="2" fill={cream} />
        <rect x="27" y="3" width="2" height="2" fill={cream} />
      </g>
    </g>
  );
}

function PairingAccessory({ animate }: { animate: boolean }) {
  // Three broadcast arcs rippling outward to the right, staggered.
  // Origin is a small moss dot above the right iris (rows 3..4), arcs
  // grow to the right and out, each fading in turn.
  const moss = "var(--color-moss)";
  const navy = "var(--color-navy)";
  return (
    <g>
      {/* origin dot — above the eye so it doesn't cover the iris */}
      <rect x="22" y="3" width="2" height="2" fill={moss} />
      <rect x="22" y="3" width="2" height="1" fill={navy} opacity="0.35" />
      {/* arc 1 — closest */}
      <g className={animate ? "anim-wisp-pair-1" : ""}>
        <rect x="25" y="2" width="1" height="1" fill={moss} />
        <rect x="25" y="5" width="1" height="1" fill={moss} />
        <rect x="26" y="3" width="1" height="2" fill={moss} />
      </g>
      {/* arc 2 — middle */}
      <g className={animate ? "anim-wisp-pair-2" : ""}>
        <rect x="27" y="1" width="1" height="1" fill={moss} />
        <rect x="27" y="6" width="1" height="1" fill={moss} />
        <rect x="28" y="2" width="1" height="4" fill={moss} />
      </g>
      {/* arc 3 — farthest */}
      <g className={animate ? "anim-wisp-pair-3" : ""}>
        <rect x="29" y="0" width="1" height="1" fill={moss} />
        <rect x="29" y="7" width="1" height="1" fill={moss} />
        <rect x="30" y="1" width="1" height="6" fill={moss} />
      </g>
    </g>
  );
}

function WaveAccessory({ animate }: { animate: boolean }) {
  // Small cream hand-paddle raised above the right arm; rocks side to
  // side on a 600 ms loop. Anchored at cols 28..31 so the left outline
  // coincides with the body's right outline (cleanly merging into the
  // ghost rather than floating detached).
  const cream = "var(--color-cream)";
  const navy = "var(--color-navy)";
  const flash = "var(--color-marigold)";
  return (
    <g
      className={animate ? "anim-wisp-wave" : ""}
      style={{ transformOrigin: "29px 14px" }}
    >
      {/* outline */}
      <rect x="29" y="10" width="3" height="1" fill={navy} />
      <rect x="29" y="14" width="3" height="1" fill={navy} />
      <rect x="28" y="11" width="1" height="3" fill={navy} />
      <rect x="31" y="11" width="1" height="3" fill={navy} />
      {/* fill */}
      <rect x="29" y="11" width="2" height="3" fill={cream} />
      {/* knuckle line */}
      <rect x="29" y="12" width="2" height="1" fill="var(--color-cream-200)" />
      {/* marigold motion sparks */}
      <rect x="26" y="9" width="1" height="1" fill={flash} opacity="0.9" />
      <rect x="28" y="8" width="1" height="1" fill={flash} opacity="0.55" />
    </g>
  );
}

function SleepZ({ animate }: { animate: boolean }) {
  return (
    <g
      fill="var(--color-purple)"
      className={animate ? "anim-wisp-zzz" : ""}
    >
      {/* large Z */}
      <rect x="20" y="3" width="4" height="1" />
      <rect x="23" y="4" width="1" height="1" />
      <rect x="22" y="5" width="1" height="1" />
      <rect x="21" y="6" width="1" height="1" />
      <rect x="20" y="7" width="4" height="1" />
      {/* mid Z drifting */}
      <rect x="25" y="1" width="3" height="1" opacity="0.75" />
      <rect x="27" y="2" width="1" height="1" opacity="0.75" />
      <rect x="26" y="3" width="1" height="1" opacity="0.75" />
      <rect x="25" y="4" width="3" height="1" opacity="0.75" />
      {/* small Z drifting up-right */}
      <rect x="29" y="0" width="2" height="1" opacity="0.5" />
      <rect x="30" y="1" width="1" height="1" opacity="0.5" />
      <rect x="29" y="2" width="2" height="1" opacity="0.5" />
    </g>
  );
}
