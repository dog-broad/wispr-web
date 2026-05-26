// Single source of truth for environment variables consumed by the client.
// Read once, validated, frozen. Components import the typed `env` object
// instead of reaching into `process.env` directly.
//
// IMPORTANT: every `NEXT_PUBLIC_*` reference in this file must be a literal
// dot-access on `process.env` (e.g. `process.env.NEXT_PUBLIC_FOO`). Next.js
// only inlines `NEXT_PUBLIC_*` vars into the client bundle when it can
// statically prove the variable name at build time. A `process.env[name]`
// dynamic indexed access — even via a tiny helper function — is opaque to
// the bundler, so it ships the lookup as-is and the runtime browser shim
// returns `undefined`. The result is the fallback wins on every prod page
// silently, which is the worst kind of bug. Keep the reads literal.

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

// HTTP base for `fetch` calls. Can be absolute (``https://api...``) or a
// relative same-origin path (``/wispr-api``) when Next rewrites front
// the API. Defaults to the local dev server.
const HTTP_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// WebSocket base for `new WebSocket(...)`. Must always be an absolute
// ws/wss URL — the browser rejects relative URLs for WebSocket, and
// Next rewrites don't proxy WS upgrades anyway. When unset, we derive
// it from HTTP_BASE: absolute http(s) URLs flip to ws(s) cleanly;
// relative HTTP bases need WS_BASE configured explicitly.
function deriveWsBase(httpBase: string): string {
  if (httpBase.startsWith("https://")) {
    return "wss://" + httpBase.slice("https://".length);
  }
  if (httpBase.startsWith("http://")) {
    return "ws://" + httpBase.slice("http://".length);
  }
  // Relative HTTP base + no WS override: best we can do is return as-is.
  // The first `new WebSocket(...)` call will throw a clear error, which
  // is better than silently routing to the wrong host.
  return httpBase;
}
const WS_BASE =
  process.env.NEXT_PUBLIC_API_WS_BASE_URL || deriveWsBase(HTTP_BASE);

export const env = Object.freeze({
  apiBaseUrl: trimTrailingSlash(HTTP_BASE),
  apiWsBaseUrl: trimTrailingSlash(WS_BASE),
});

export type Env = typeof env;
