import { cn } from "@/lib/cn";

export interface PixelIconProps {
  /** Pixelarticons icon name, e.g. "paste", "lock", "qr-code" */
  name: string;
  size?: number;
  className?: string;
  label?: string;
}

// Wraps a Pixelarticons SVG by stamping it as a CSS mask. Pixelarticons ships
// the raw .svg files at `pixelarticons/svg/<name>.svg` so we point at those.
// This keeps every icon recolored via `currentColor` and pixel-rendered.
export function PixelIcon({ name, size = 20, className, label }: PixelIconProps) {
  const src = `/pixelarticons/${name}.svg`;
  const a11y = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      className={cn("pixel inline-block align-middle", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
