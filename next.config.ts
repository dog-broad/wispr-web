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
      // ``'self'`` covers the same-origin /wispr-api/* HTTP path (which
      // Next rewrites to the upstream API). The wss:// entries name the
      // hosts the browser opens raw WebSockets to — Next rewrites can't
      // proxy WS upgrades, so each WS-base hostname must be listed
      // explicitly. wispr-api.duckdns.org is the primary path; the
      // api.wispr.rushyendra.dev entry stays as a transitional fallback.
      "connect-src 'self' wss://wispr-api.duckdns.org wss://api.wispr.rushyendra.dev https://api.wispr.rushyendra.dev",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

// Origin of the upstream API service. Configurable via env so the
// rewrite below points wherever the deployment expects, defaulting to
// the production hostname. The same value lives behind
// NEXT_PUBLIC_API_BASE_URL (set to ``/wispr-api`` in Vercel production)
// so the browser hits a same-origin URL and the rewrite layer does
// the cross-origin fetch on the edge — the browser never sees a
// cross-origin response.
const API_REWRITE_TARGET =
  process.env.WISPR_API_REWRITE_TARGET || "https://api.wispr.rushyendra.dev";

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
  async rewrites() {
    // Proxy /wispr-api/* through the Next edge to the upstream API.
    // The browser sees only same-origin requests; the cross-origin
    // fetch happens on the edge. Note this layer can't proxy WS
    // upgrades — those still need an absolute wss:// URL on the
    // client (see env.apiWsBaseUrl in lib/env.ts).
    return [
      {
        source: "/wispr-api/:path*",
        destination: `${API_REWRITE_TARGET}/:path*`,
      },
    ];
  },
};

export default config;
