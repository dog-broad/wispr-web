import { ImageResponse } from "next/og";

// next/og lets us render OpenGraph cards as React JSX at build / first-
// request time. The output is a PNG served by Next when a crawler asks
// for the image referenced in <meta property="og:image">. Same card
// covers /, /about, and (by inheritance) anything that does not export
// its own opengraph-image.tsx.

// next/og uses @vercel/og under the hood. Pin to the edge runtime so it
// uses the worker-friendly entry that doesn't hit the `fileURLToPath`
// path-resolution bug present in the Node entry of certain versions.
export const runtime = "edge";

export const alt = "Wispr · encrypted clipboard for sending text, code, and files";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f4ecd8";
const NAVY = "#1f1a2e";
const PINK = "#ff6188";
const MARIGOLD = "#f9b572";
const PURPLE = "#8b5fbf";
const MOSS = "#7a9e7e";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          position: "relative",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {/* Pixel scanline overlay implied by the cream-on-navy palette;
            keeping the image flat avoids next/og rendering quirks with
            mix-blend modes. */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "8px 24px",
              background: NAVY,
              color: CREAM,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              border: `4px solid ${NAVY}`,
            }}
          >
            <span style={{ display: "flex", color: MARIGOLD }}>✦</span>
            Wispr
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 128,
              lineHeight: 1,
              color: NAVY,
              fontWeight: 900,
              letterSpacing: -2,
            }}
          >
            send anything,
            <br />
            <span style={{ color: PINK }}>privately.</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 36,
              lineHeight: 1.3,
              color: NAVY,
              opacity: 0.85,
              maxWidth: 900,
            }}
          >
            A web-only zero-knowledge clipboard. Encrypted in your browser
            before it leaves.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: NAVY,
            fontSize: 24,
            opacity: 0.8,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ display: "flex", color: PINK }}>●</span>
            <span style={{ display: "flex" }}>Link</span>
            <span style={{ display: "flex", color: PURPLE }}>●</span>
            <span style={{ display: "flex" }}>PIN</span>
            <span style={{ display: "flex", color: MARIGOLD }}>●</span>
            <span style={{ display: "flex" }}>Pair</span>
            <span style={{ display: "flex", color: MOSS }}>●</span>
            <span style={{ display: "flex" }}>My clips</span>
          </span>
          <span style={{ display: "flex" }}>wispr.rushyendra.dev</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
