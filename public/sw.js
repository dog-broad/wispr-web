// App-shell service worker. Runtime caching, not a precache manifest: the build
// hashes every chunk, so a static precache list would go stale on every deploy.
// Instead we cache-first the immutable hashed assets as they're requested, and
// network-first the page shells — so a page you've visited (plus the precached
// "/" and "/about") cold-loads offline, while a fresh online visit always wins.
//
// Never touches the API (/wispr-api) or cross-origin requests: those stay
// network-only so encrypted payloads and auth'd responses are never stored.
const CACHE = "wispr-shell-v1";
const SHELL = ["/", "/about", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/apple-icon") ||
    /\.(?:svg|png|jpe?g|gif|webp|woff2?|css|js)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API responses are dynamic + auth'd + hold encrypted payloads — never cache.
  if (url.pathname.startsWith("/wispr-api")) return;

  // Page shells: network-first, fall back to the cached shell (then "/").
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = (await cache.match(request)) || (await cache.match("/"));
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Immutable hashed assets: cache-first, populate on first miss.
  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      })(),
    );
  }
});
