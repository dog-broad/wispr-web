import type { MetadataRoute } from "next";

// PWA manifest — makes Wispr installable. The SVG icon is marked `any`, which
// modern browsers accept for installability and scale to every launcher size;
// the apple-icon route covers iOS. theme/background match the cream+navy shell.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wispr · encrypted clipboard",
    short_name: "Wispr",
    description: "A web-only zero-knowledge clipboard for text, code, and files.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4ecd8",
    theme_color: "#1f1a2e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
