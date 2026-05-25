// OG preview fetched directly from the receiver's browser. The privacy
// posture matters: routing this through Wispr's API would leak the URL
// to the server (breaking the Mode-1 ZK guarantee); routing it through
// a third-party preview service would leak to that service. Neither
// is acceptable, so we fetch the target site directly and parse its
// HTML for og:* / twitter:* tags. CORS-restrictive sites (the majority)
// will reject the request, in which case the receiver simply gets the
// bare URL card with no preview — that's the right failure mode here.

export interface OgPreview {
  hostname: string;
  title?: string;
  description?: string;
  image?: string;
}

interface FetchOgOptions {
  signal?: AbortSignal;
  /** Cap on how many bytes of HTML the fetch will consume before
   *  giving up. Some sites serve multi-MB HTML pages; the head is
   *  tiny by comparison and we only need the first slab. */
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 256 * 1024;

/** Attempt to fetch an OG preview for ``url``. Returns ``null`` on
 *  any failure (CORS rejection, network error, parse miss). The
 *  hostname is always populated when the function succeeds. */
export async function fetchOgPreview(
  url: URL,
  options: FetchOgOptions = {},
): Promise<OgPreview | null> {
  const init: RequestInit = {
    mode: "cors",
    credentials: "omit",
    headers: { Accept: "text/html,application/xhtml+xml" },
    referrerPolicy: "no-referrer",
  };
  if (options.signal) init.signal = options.signal;
  let response: Response;
  try {
    response = await fetch(url.href, init);
  } catch {
    // CORS rejection lands here as a TypeError. Same handling either
    // way — drop the preview, keep the bare URL.
    return null;
  }
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) return null;

  let html: string;
  try {
    html = await readResponseBodyBounded(response, options.maxBytes ?? DEFAULT_MAX_BYTES);
  } catch {
    return null;
  }

  return parseOgFromHtml(url, html);
}

async function readResponseBodyBounded(response: Response, maxBytes: number): Promise<string> {
  if (response.body === null) {
    return response.text();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;
      chunks.push(value);
      total += value.byteLength;
      if (total >= maxBytes) {
        // Got enough — cancel the stream so we don't keep downloading
        // a long page body when the head is already in hand.
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(combined);
}

/** Exported for tests — pulls OG-style metadata out of raw HTML. */
export function parseOgFromHtml(url: URL, html: string): OgPreview {
  // DOMParser is available in browsers + jsdom. In the Node test
  // environment we ship a small regex-based parser instead so the
  // unit tests don't need a DOM.
  const preview: OgPreview = { hostname: url.hostname };

  const metaProps = collectMetaProps(html);
  const title =
    metaProps.get("og:title") ??
    metaProps.get("twitter:title") ??
    extractTitleTag(html);
  const description =
    metaProps.get("og:description") ?? metaProps.get("twitter:description");
  const image = metaProps.get("og:image") ?? metaProps.get("twitter:image");

  if (title) preview.title = title.trim();
  if (description) preview.description = description.trim();
  if (image) {
    const resolved = resolveImageUrl(url, image.trim());
    if (resolved !== undefined) preview.image = resolved;
  }

  return preview;
}

const META_TAG_RE = /<meta\b([^>]*)\/?>/gi;
const ATTR_RE = /(\w[\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;

function collectMetaProps(html: string): Map<string, string> {
  const out = new Map<string, string>();
  let match: RegExpExecArray | null;
  META_TAG_RE.lastIndex = 0;
  while ((match = META_TAG_RE.exec(html)) !== null) {
    const attrs = parseAttributes(match[1] ?? "");
    const key = attrs.get("property") ?? attrs.get("name");
    const value = attrs.get("content");
    if (key !== undefined && value !== undefined && !out.has(key)) {
      out.set(key.toLowerCase(), value);
    }
  }
  return out;
}

function parseAttributes(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(raw)) !== null) {
    const key = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    if (key !== undefined && value !== undefined) {
      out.set(key, value);
    }
  }
  return out;
}

function extractTitleTag(html: string): string | undefined {
  const match = TITLE_RE.exec(html);
  return match?.[1];
}

function resolveImageUrl(pageUrl: URL, src: string): string | undefined {
  try {
    return new URL(src, pageUrl).href;
  } catch {
    return undefined;
  }
}
