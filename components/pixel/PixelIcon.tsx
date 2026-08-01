import { cn } from "@/lib/cn";

export interface PixelIconProps {
  /** Pixelarticons icon ID, e.g. "lock", "send", "chevron-down". The
   *  complete list lives in node_modules/pixelarticons/svg/*.svg; the
   *  build-icons.mjs prebuild step emits all of them into
   *  public/pixel-icons.svg as <symbol id="px-<name>"> blocks. */
  name: string;
  /** Pixel side length of the rendered square. Default 20 matches the
   *  body-text size in the design system; bump for prominent CTAs. */
  size?: number;
  /** Optional className for layout / margin / color tweaks. The icon
   *  itself follows `currentColor`, so wrapping `text-[var(--color-pink)]`
   *  or similar around it is the standard recoloring path. */
  className?: string;
  /** When set, the icon becomes role="img" with this aria-label. Omit
   *  for decorative use; the wrapper defaults to aria-hidden. */
  label?: string;
}

// Single source of truth for utility icons: any small consistent
// pictogram (button leading icon, badge label, table affordance, etc.)
// renders through here. Branded illustrations (the Wisp mascot, the
// marquee chrome, the OG image card) stay hand-rolled.
//
// Rendering strategy: external SVG sprite via <use href="...#px-name">.
// Pixelarticons paths declare fill="currentColor"; the consumer's color
// cascades through the <use>'s shadow tree. shapeRendering="crispEdges"
// keeps the modules crisp on high-DPR displays.
export function PixelIcon({ name, size = 20, className, label }: PixelIconProps) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <svg
      {...a11y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={cn("pixel inline-block align-middle", className)}
    >
      <use href={`/pixel-icons.svg#px-${name}`} />
    </svg>
  );
}
