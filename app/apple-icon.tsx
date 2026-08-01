import { ImageResponse } from "next/og";

// Apple touch icon (opaque PNG for the iOS home screen). Renders the brand
// spark (the same mark as the SVG favicon) as Satori-safe divs on navy.
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const NAVY = "#1f1a2e";
const MARIGOLD = "#f9b572";
const PINK = "#ff6188";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: NAVY,
          position: "relative",
          display: "flex",
        }}
      >
        {/* vertical arm */}
        <div style={{ position: "absolute", top: 24, left: 80, width: 20, height: 132, background: MARIGOLD }} />
        {/* horizontal arm */}
        <div style={{ position: "absolute", top: 80, left: 24, width: 132, height: 20, background: MARIGOLD }} />
        {/* diamond centre */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 56,
            width: 68,
            height: 68,
            background: MARIGOLD,
            transform: "rotate(45deg)",
          }}
        />
        {/* pink core */}
        <div style={{ position: "absolute", top: 79, left: 79, width: 22, height: 22, background: PINK }} />
      </div>
    ),
    { ...size },
  );
}
