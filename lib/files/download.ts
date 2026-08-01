// Fetch a file's ciphertext chunks from R2 (presigned GETs) and decrypt them
// in order (each chunk's index is bound as AAD, so an out-of-order or swapped
// chunk fails to decrypt), then concatenate into the original plaintext.

import { openChunk } from "@/lib/files/chunk";

export async function downloadChunks(key: Uint8Array, urls: string[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for (let i = 0; i < urls.length; i++) {
    const response = await fetch(urls[i]!);
    if (!response.ok) {
      throw new Error(`chunk ${i} download failed: ${response.status}`);
    }
    parts.push(await openChunk(key, i, new Uint8Array(await response.arrayBuffer())));
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
