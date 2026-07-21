// File chunking for R2-backed uploads.
//
// A file is encrypted 1 MiB at a time. Each chunk gets its own IV (from the
// worker) and binds its index as AES-GCM additional-authenticated-data, so a
// chunk can't be silently reordered, dropped, or swapped between uploads —
// decrypt fails unless the same index is supplied. On the wire each chunk
// object is `iv || ciphertext+tag`, matching the inline envelope format.

import { decrypt, encrypt } from "@/lib/crypto/client";
import { packEnvelope, unpackEnvelope } from "@/lib/crypto/encoding";

export const CHUNK_SIZE = 1024 * 1024; // 1 MiB plaintext per chunk
export const MAX_FILE_BYTES = 25 * CHUNK_SIZE; // 25 MB ceiling (PROJECT §10 M3)

/** Number of 1 MiB chunks a file of `byteLength` splits into (min 1). */
export function chunkCountFor(byteLength: number): number {
  return Math.max(1, Math.ceil(byteLength / CHUNK_SIZE));
}

/** 4-byte big-endian chunk index, used as AES-GCM AAD. */
export function chunkAad(index: number): Uint8Array {
  const aad = new Uint8Array(4);
  new DataView(aad.buffer).setUint32(0, index, false);
  return aad;
}

/** Encrypt one plaintext chunk under `key`, returning the `iv || ciphertext`
 *  envelope ready to PUT to R2. The chunk index is bound as AAD. */
export async function sealChunk(
  key: Uint8Array,
  index: number,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const { iv, ciphertext } = await encrypt(key, plaintext, chunkAad(index));
  return packEnvelope(iv, ciphertext);
}

/** Decrypt one chunk envelope fetched from R2. Rejects if the key, IV, or
 *  chunk index doesn't match what it was sealed with. */
export async function openChunk(
  key: Uint8Array,
  index: number,
  envelope: Uint8Array,
): Promise<Uint8Array> {
  const { iv, ciphertext } = unpackEnvelope(envelope);
  return decrypt(key, ciphertext, iv, chunkAad(index));
}

/** Slice a file's bytes into ≤1 MiB plaintext chunks. */
export function sliceChunks(bytes: Uint8Array): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    chunks.push(bytes.subarray(offset, offset + CHUNK_SIZE));
  }
  return chunks.length > 0 ? chunks : [new Uint8Array(0)];
}
