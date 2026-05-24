// Single source of truth for environment variables consumed by the client.
// Read once, validated, frozen. Components import the typed `env` object
// instead of reaching into `process.env` directly.
//
// Defaults are tuned for local dev so `pnpm dev` and `pnpm build` work
// out of the box. Deployed environments (Vercel) override every var via
// the platform's env config. If a deploy ever ships with a stale local
// default, the live-env badge on /styleguide will turn red immediately
// — we don't need a build-time guard to surface that.

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function envOr(key: string, fallback: string): string {
  const raw = process.env[key];
  return raw && raw.length > 0 ? raw : fallback;
}

export const env = Object.freeze({
  apiBaseUrl: trimTrailingSlash(envOr("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")),
});

export type Env = typeof env;
