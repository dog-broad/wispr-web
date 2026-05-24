import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [
      {
        // Receive shells must never be indexed by search engines — the
        // URL fragment is the secret and we don't want crawlers caching
        // the page (even though the body decrypts client-side, search
        // engines rendering the URL would leak the snippet id).
        // Belt-and-braces alongside the per-page robots meta.
        source: "/s/:id*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default config;
