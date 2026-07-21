// Encrypted-metadata schema shared by every share mode.
//
// The server stores this blob opaquely (it's encrypted alongside the
// content); only the client that holds the key can read it. It carries the
// hints a receiver needs to render: the syntax-highlight language for code,
// and the name/mime of an inline file attachment.

import type { Language } from "@/lib/highlight/highlight";

export interface ClipMetadata {
  v: 1;
  lang?: Language;
  name?: string;
  mime?: string;
}

export function encodeMetadata(meta: ClipMetadata): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(meta));
}

/** Parse decrypted metadata bytes, tolerating anything off-schema by falling
 *  back to the minimal `{ v: 1 }` shape rather than throwing. */
export function decodeMetadata(bytes: Uint8Array): ClipMetadata {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const meta: ClipMetadata = { v: 1 };
    if (typeof parsed.lang === "string") meta.lang = parsed.lang as Language;
    if (typeof parsed.name === "string") meta.name = parsed.name;
    if (typeof parsed.mime === "string") meta.mime = parsed.mime;
    return meta;
  } catch {
    return { v: 1 };
  }
}
