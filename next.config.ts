import type { NextConfig } from "next";

// Defense-in-depth headers applied to every route. The CSP allows
// 'unsafe-inline' on script-src and style-src because Next.js injects
// inline bootstrap + hydration scripts and the inline theme-bootstrap
// snippet runs before paint. The marketing surface doesn't reflect
// user input into HTML, so the XSS vector is narrow; tightening to
// nonces would require request-scoped middleware that isn't worth the
// complexity for v1.
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self' wss://api.wispr.rushyendra.dev https://api.wispr.rushyendra.dev",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
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
