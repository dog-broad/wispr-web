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

export const env = Object.freeze({
  apiBaseUrl: trimTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  ),
});

export type Env = typeof env;
