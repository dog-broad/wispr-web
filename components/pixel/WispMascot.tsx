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
// Silhouette is a clean rounded balloon: domed top, straight sides
// (no protruding arms), four small scallop humps at the bottom. Eye
// expression is state-dependent — sparkle eyes by default, X eyes for
// errors, hearts for success, slits for sleep, ^_^ curves for wave.

type Row = readonly [y: number, x0: number, x1: number];

const CREAM_ROWS: readonly Row[] = [
  // dome — widens from 8 to 24 over 7 rows, +1 per row except row 1→2 (+2)
  [1, 12, 19], // 8
  [2, 10, 21], // 12 (+2 each side, needs shoulder extras)
  [3, 9, 22], // 14
  [4, 8, 23], // 16
  [5, 7, 24], // 18
  [6, 6, 25], // 20
  [7, 5, 26], // 22
  // body — 24 wide, flat-sided. No arm flare.
  [8, 4, 27],
  [9, 4, 27],
  [10, 4, 27],
  [11, 4, 27],
  [12, 4, 27],
  [13, 4, 27],
  [14, 4, 27],
  [15, 4, 27],
  [16, 4, 27],
  [17, 4, 27],
  [18, 4, 27],
  [19, 4, 27],
  [20, 4, 27],
  [21, 4, 27],
  [22, 4, 27],
  [23, 4, 27],
  // four scallop humps, 4 wide each
  [24, 5, 8],
  [24, 11, 14],
  [24, 17, 20],
  [24, 23, 26],
  // droplet middles (2 wide)
  [25, 6, 7],
  [25, 12, 13],
  [25, 18, 19],
  [25, 24, 25],
  // droplet tips (1 wide)
  [26, 6, 6],
  [26, 12, 12],
  [26, 18, 18],
  [26, 24, 24],
];

const NAVY_EXTRAS: readonly { x: number; y: number; w?: number }[] = [
  // top navy cap above row-1 cream
  { x: 12, y: 0, w: 8 },
  // row 1 → row 2 widen +2 each side
  { x: 10, y: 1 },
  { x: 21, y: 1 },
  // droplet bottom caps
  { x: 5, y: 27, w: 3 },
  { x: 11, y: 27, w: 3 },
  { x: 17, y: 27, w: 3 },
  { x: 23, y: 27, w: 3 },
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
  const cream = "var(--color-cream)";
  const creamShine = "var(--color-cream-50)";
  const creamShade = "var(--color-cream-200)";
  const navy = "var(--color-navy)";
  const blush = "var(--color-pink)";

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
      <rect x="23" y="3" width="1" height="4" fill={creamShade} opacity="0.55" />
      <rect x="24" y="5" width="1" height="18" fill={creamShade} opacity="0.45" />
      <rect x="25" y="8" width="1" height="14" fill={creamShade} opacity="0.35" />

      {/* forehead shine */}
      <rect x="11" y="3" width="1" height="1" fill={creamShine} />
      <rect x="10" y="4" width="1" height="1" fill={creamShine} />
      <rect x="12" y="2" width="1" height="1" fill={creamShine} opacity="0.7" />

      {/* ----- eyes (state-dependent) ----- */}
      <Eyes state={state} animate={animate} />

      {/* ----- mouth ----- */}
      <Mouth state={state} />

      {/* ----- pink blush (2×2 ovals at the cheeks) ----- */}
      <rect x="4" y="11" width="2" height="2" fill={blush} opacity="0.78" />
      <rect x="26" y="11" width="2" height="2" fill={blush} opacity="0.78" />
      <rect x="4" y="11" width="1" height="1" fill={blush} opacity="0.95" />
      <rect x="26" y="11" width="1" height="1" fill={blush} opacity="0.95" />
    </g>
  );
}

function Eyes({ state, animate }: { state: WispState; animate: boolean }) {
  const navy = "var(--color-navy)";
  const sparkle = "#ffffff";
  const pink = "var(--color-pink)";

  // Only the default sparkle-eye state blinks. Closed, X, slit, and heart
  // expressions are already pinned-shut or non-iris and don't need it.
  const blinks =
    state === "idle" ||
    state === "sending" ||
    state === "linking" ||
    state === "pinning" ||
    state === "pairing";

  if (state === "sleeping") {
    // Sleepy slits — narrow horizontal lines, 5 wide
    return (
      <g>
        <rect x="7" y="10" width="5" height="1" fill={navy} />
        <rect x="20" y="10" width="5" height="1" fill={navy} />
      </g>
    );
  }

  if (state === "error") {
    // X eyes — dizzy/error
    return <g>{xEye(7, 8, navy)}{xEye(20, 8, navy)}</g>;
  }

  if (state === "success") {
    // Heart eyes — pink love
    return (
      <g>
        {heartEye(7, 8, pink)}
        {heartEye(20, 8, pink)}
      </g>
    );
  }

  if (state === "wave") {
    // ^_^ closed-curve happy eyes
    return (
      <g>
        {happyArc(7, 8, navy)}
        {happyArc(20, 8, navy)}
      </g>
    );
  }

  // Default — kawaii sparkle eyes
  return (
    <g
      className={animate && blinks ? "anim-wisp-blink" : ""}
      style={{ transformOrigin: "16px 10px" }}
    >
      {/* left iris 5x5 */}
      <rect x="7" y="8" width="5" height="5" fill={navy} />
      {/* right iris 5x5 */}
      <rect x="20" y="8" width="5" height="5" fill={navy} />
      {/* single white sparkle 2x2, upper-left — drifts on a slow cycle */}
      <g
        className={animate ? "anim-wisp-sparkle" : ""}
        style={{ transformOrigin: "16px 10px" }}
      >
        <rect x="7" y="8" width="2" height="2" fill={sparkle} />
        <rect x="20" y="8" width="2" height="2" fill={sparkle} />
      </g>
    </g>
  );
}

function xEye(cx: number, cy: number, color: string) {
  // 5×5 X pattern
  return (
    <g key={`x-${cx}`} fill={color}>
      <rect x={cx} y={cy} width="1" height="1" />
      <rect x={cx + 4} y={cy} width="1" height="1" />
      <rect x={cx + 1} y={cy + 1} width="1" height="1" />
      <rect x={cx + 3} y={cy + 1} width="1" height="1" />
      <rect x={cx + 2} y={cy + 2} width="1" height="1" />
      <rect x={cx + 1} y={cy + 3} width="1" height="1" />
      <rect x={cx + 3} y={cy + 3} width="1" height="1" />
      <rect x={cx} y={cy + 4} width="1" height="1" />
      <rect x={cx + 4} y={cy + 4} width="1" height="1" />
    </g>
  );
}

function heartEye(cx: number, cy: number, color: string) {
  // 5×5 heart sprite — two lumps at top, V tip at bottom
  return (
    <g key={`h-${cx}`} fill={color}>
      <rect x={cx + 1} y={cy} width="1" height="1" />
      <rect x={cx + 3} y={cy} width="1" height="1" />
      <rect x={cx} y={cy + 1} width="5" height="2" />
      <rect x={cx + 1} y={cy + 3} width="3" height="1" />
      <rect x={cx + 2} y={cy + 4} width="1" height="1" />
    </g>
  );
}

function happyArc(cx: number, cy: number, color: string) {
  // ^_^ shape — peak at center, tails curving down. 5 wide × 3 tall.
  return (
    <g key={`a-${cx}`} fill={color}>
      <rect x={cx + 2} y={cy + 1} width="1" height="1" />
      <rect x={cx + 1} y={cy + 2} width="1" height="1" />
      <rect x={cx + 3} y={cy + 2} width="1" height="1" />
      <rect x={cx} y={cy + 3} width="1" height="1" />
      <rect x={cx + 4} y={cy + 3} width="1" height="1" />
    </g>
  );
}

function Mouth({ state }: { state: WispState }) {
  const navy = "var(--color-navy)";
  const pink = "var(--color-pink)";
  const color = state === "error" ? pink : navy;

  switch (state) {
    case "success":
      // small open smile
      return (
        <>
          <rect x="14" y="14" width="4" height="1" fill={color} />
          <rect x="15" y="15" width="2" height="1" fill={color} />
        </>
      );
    case "error":
      // tiny worried open o
      return (
        <>
          <rect x="15" y="14" width="2" height="1" fill={color} />
          <rect x="14" y="15" width="1" height="1" fill={color} />
          <rect x="17" y="15" width="1" height="1" fill={color} />
          <rect x="15" y="16" width="2" height="1" fill={color} />
        </>
      );
    case "sleeping":
      // small open snore o
      return (
        <>
          <rect x="15" y="14" width="2" height="1" fill={color} opacity="0.4" />
          <rect x="15" y="15" width="2" height="1" fill={color} />
        </>
      );
    case "wave":
      // big open grin
      return (
        <>
          <rect x="13" y="14" width="6" height="1" fill={color} />
          <rect x="14" y="15" width="4" height="1" fill={color} />
        </>
      );
    default:
      // tiny kawaii w-smile
      return (
        <>
          <rect x="13" y="14" width="1" height="1" fill={color} />
          <rect x="18" y="14" width="1" height="1" fill={color} />
          <rect x="14" y="15" width="4" height="1" fill={color} />
        </>
      );
  }
}

// --- accessories --------------------------------------------------------

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

function SendingAccessory({ animate }: { animate: boolean }) {
  const navy = "var(--color-navy)";
  const cream = "var(--color-cream)";
  const shade = "var(--color-cream-200)";
  const flash = "var(--color-marigold)";
  return (
    <g>
      {/* marigold thrust chevrons */}
      <g className={animate ? "anim-wisp-thrust" : ""}>
        <rect x="20" y="5" width="2" height="1" fill={flash} />
        <rect x="19" y="6" width="1" height="1" fill={flash} opacity="0.7" />
        <rect x="19" y="3" width="1" height="1" fill={flash} opacity="0.55" />
        <rect x="17" y="5" width="1" height="1" fill={flash} opacity="0.45" />
      </g>
      {/* plane (translates on the same loop) */}
      <g className={animate ? "anim-wisp-plane" : ""}>
        <rect x="28" y="1" width="1" height="1" fill={navy} />
        <rect x="27" y="2" width="2" height="1" fill={navy} />
        <rect x="26" y="3" width="3" height="1" fill={navy} />
        <rect x="25" y="4" width="4" height="1" fill={navy} />
        <rect x="22" y="5" width="7" height="1" fill={navy} />
        <rect x="23" y="6" width="1" height="1" fill={navy} />
        <rect x="25" y="6" width="3" height="1" fill={navy} />
        <rect x="24" y="7" width="3" height="1" fill={navy} />
        <rect x="28" y="3" width="1" height="2" fill={cream} />
        <rect x="27" y="4" width="1" height="1" fill={cream} />
        <rect x="24" y="6" width="1" height="1" fill={cream} />
        <rect x="25" y="5" width="2" height="1" fill={cream} />
        <rect x="26" y="4" width="1" height="1" fill={shade} />
        <rect x="26" y="6" width="1" height="1" fill={shade} />
      </g>
    </g>
  );
}

function LinkingAccessory({ animate }: { animate: boolean }) {
  const navy = "var(--color-navy)";
  const pink = "var(--color-pink)";
  return (
    <g
      className={animate ? "anim-wisp-link" : ""}
      style={{ transformOrigin: "24px 4px" }}
    >
      <rect x="20" y="3" width="4" height="1" fill={navy} />
      <rect x="20" y="6" width="4" height="1" fill={navy} />
      <rect x="19" y="4" width="1" height="2" fill={navy} />
      <rect x="23" y="4" width="1" height="2" fill={navy} />
      <rect x="20" y="4" width="3" height="2" fill={pink} />
      <rect x="21" y="4" width="1" height="2" fill="var(--color-cream)" />
      <rect x="24" y="2" width="4" height="1" fill={navy} />
      <rect x="24" y="5" width="4" height="1" fill={navy} />
      <rect x="23" y="3" width="1" height="2" fill={navy} />
      <rect x="28" y="3" width="1" height="2" fill={navy} />
      <rect x="24" y="3" width="4" height="2" fill={pink} />
      <rect x="26" y="3" width="1" height="2" fill="var(--color-cream)" />
      <rect x="23" y="4" width="1" height="2" fill={navy} />
    </g>
  );
}

function PinningAccessory({ animate }: { animate: boolean }) {
  const navy = "var(--color-navy)";
  const purple = "var(--color-purple)";
  const cream = "var(--color-cream)";
  return (
    <g>
      <rect x="20" y="1" width="10" height="1" fill={navy} />
      <rect x="20" y="7" width="10" height="1" fill={navy} />
      <rect x="19" y="2" width="1" height="5" fill={navy} />
      <rect x="30" y="2" width="1" height="5" fill={navy} />
      <rect x="20" y="2" width="10" height="5" fill={purple} />
      <rect x="24" y="1" width="1" height="1" fill={cream} opacity="0.6" />
      <rect x="27" y="1" width="1" height="1" fill={cream} opacity="0.6" />
      <rect x="24" y="7" width="1" height="1" fill={cream} opacity="0.6" />
      <rect x="27" y="7" width="1" height="1" fill={cream} opacity="0.6" />
      <g className={animate ? "anim-wisp-pin" : ""}>
        <rect x="21" y="3" width="2" height="2" fill={cream} />
        <rect x="24" y="3" width="2" height="2" fill={cream} />
        <rect x="27" y="3" width="2" height="2" fill={cream} />
      </g>
    </g>
  );
}

function PairingAccessory({ animate }: { animate: boolean }) {
  const moss = "var(--color-moss)";
  const navy = "var(--color-navy)";
  return (
    <g>
      {/* origin dot — above the right eye */}
      <rect x="22" y="3" width="2" height="2" fill={moss} />
      <rect x="22" y="3" width="2" height="1" fill={navy} opacity="0.35" />
      <g className={animate ? "anim-wisp-pair-1" : ""}>
        <rect x="25" y="2" width="1" height="1" fill={moss} />
        <rect x="25" y="5" width="1" height="1" fill={moss} />
        <rect x="26" y="3" width="1" height="2" fill={moss} />
      </g>
      <g className={animate ? "anim-wisp-pair-2" : ""}>
        <rect x="27" y="1" width="1" height="1" fill={moss} />
        <rect x="27" y="6" width="1" height="1" fill={moss} />
        <rect x="28" y="2" width="1" height="4" fill={moss} />
      </g>
      <g className={animate ? "anim-wisp-pair-3" : ""}>
        <rect x="29" y="0" width="1" height="1" fill={moss} />
        <rect x="29" y="7" width="1" height="1" fill={moss} />
        <rect x="30" y="1" width="1" height="6" fill={moss} />
      </g>
    </g>
  );
}

function WaveAccessory({ animate }: { animate: boolean }) {
  // Sheet ghosts don't wave — they twinkle. Four small marigold sparkle
  // crosses positioned around the ghost, each fading in and out in turn
  // on a 2.4 s loop so the whole field feels alive. Paired with the ^_^
  // closed-eye grin, this reads as "hi there!" without needing arms.
  const flash = "var(--color-marigold)";
  const pink = "var(--color-pink)";

  const sparkles: { cx: number; cy: number; fill: string; cls: string }[] = [
    { cx: 29, cy: 4, fill: flash, cls: "anim-wisp-twinkle-1" },
    { cx: 2, cy: 7, fill: pink, cls: "anim-wisp-twinkle-2" },
    { cx: 30, cy: 19, fill: flash, cls: "anim-wisp-twinkle-3" },
    { cx: 1, cy: 18, fill: pink, cls: "anim-wisp-twinkle-4" },
  ];

  return (
    <g>
      {sparkles.map(({ cx, cy, fill, cls }, i) => (
        <g key={i} className={animate ? cls : ""} fill={fill}>
          {/* 3-pixel cross — reads as a sparkle/star */}
          <rect x={cx} y={cy - 1} width="1" height="1" />
          <rect x={cx - 1} y={cy} width="3" height="1" />
          <rect x={cx} y={cy + 1} width="1" height="1" />
        </g>
      ))}
    </g>
  );
}

function SleepZ({ animate }: { animate: boolean }) {
  return (
    <g
      fill="var(--color-purple)"
      className={animate ? "anim-wisp-zzz" : ""}
    >
      <rect x="20" y="3" width="4" height="1" />
      <rect x="23" y="4" width="1" height="1" />
      <rect x="22" y="5" width="1" height="1" />
      <rect x="21" y="6" width="1" height="1" />
      <rect x="20" y="7" width="4" height="1" />
      <rect x="25" y="1" width="3" height="1" opacity="0.75" />
      <rect x="27" y="2" width="1" height="1" opacity="0.75" />
      <rect x="26" y="3" width="1" height="1" opacity="0.75" />
      <rect x="25" y="4" width="3" height="1" opacity="0.75" />
      <rect x="29" y="0" width="2" height="1" opacity="0.5" />
      <rect x="30" y="1" width="1" height="1" opacity="0.5" />
      <rect x="29" y="2" width="2" height="1" opacity="0.5" />
    </g>
  );
}
