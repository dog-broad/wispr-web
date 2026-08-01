// Sync (Mode 4) clip envelope: seal for upload, open for display.
//
// Each clip gets a fresh per-snippet DEK. The content and metadata are
// AES-GCM'd under the DEK; the DEK itself is wrapped by the tab's master KEK
// (held only inside the crypto worker). The server therefore stores just the
// ciphertext + the wrapped DEK: never the DEK, never the KEK (zero-knowledge).

import type { SyncItem } from "@/lib/api/sync";
import { decodeMetadata, encodeMetadata, type ClipMetadata } from "@/lib/clip/metadata";
import { decrypt, encrypt, generateKey, unwrapDek, wrapDek } from "@/lib/crypto/client";
import { packEnvelope, unpackEnvelope } from "@/lib/crypto/encoding";

export interface SealedClip {
  // `iv || ciphertext` blobs, ready to base64 for the wire.
  ciphertext: Uint8Array;
  encryptedMetadata: Uint8Array;
  wrappedDek: Uint8Array;
  wrappedDekIv: Uint8Array;
}

/** Encrypt content + metadata under a fresh DEK and wrap that DEK with the
 *  master KEK. Requires the passphrase to be unlocked in this tab. */
export async function sealClip(content: Uint8Array, metadata: ClipMetadata): Promise<SealedClip> {
  const dek = await generateKey();
  const sealedContent = await encryptWith(dek, content);
  const sealedMeta = await encryptWith(dek, encodeMetadata(metadata));
  const { wrapped, iv } = await wrapDek(dek);
  return {
    ciphertext: sealedContent,
    encryptedMetadata: sealedMeta,
    wrappedDek: wrapped,
    wrappedDekIv: iv,
  };
}

export interface OpenedClip {
  content: Uint8Array;
  metadata: ClipMetadata;
}

/** Unwrap a clip's DEK with the master KEK, then decrypt content + metadata.
 *  For a storage-backed file clip the content lives in R2, so ``content`` comes
 *  back empty and the bytes are fetched separately via {@link downloadClipFile}.
 *  Rejects if the passphrase isn't unlocked or the KEK doesn't match. */
export async function openClip(item: SyncItem): Promise<OpenedClip> {
  const dek = await unwrapDek(item.wrappedDek, item.wrappedDekIv);
  const metaBytes = await decryptEnvelope(dek, item.encryptedMetadata);
  const metadata = decodeMetadata(metaBytes);
  if (item.chunkCount !== null) {
    return { content: new Uint8Array(0), metadata };
  }
  const content = await decryptEnvelope(dek, item.ciphertext);
  return { content, metadata };
}

/** Fetch + decrypt a storage-backed file clip's chunks in order. The DEK is
 *  re-unwrapped from the item, so the plaintext bytes only ever exist in this
 *  tab. ``urls`` come from fetchSyncFileUrls. */
export async function downloadClipFile(item: SyncItem, urls: string[]): Promise<Uint8Array> {
  const dek = await unwrapDek(item.wrappedDek, item.wrappedDekIv);
  const { downloadChunks } = await import("@/lib/files/download");
  return downloadChunks(dek, urls);
}

export interface SealedFileMeta {
  // Raw DEK used to chunk-encrypt the file bytes before upload.
  dek: Uint8Array;
  wrappedDek: Uint8Array;
  wrappedDekIv: Uint8Array;
  encryptedMetadata: Uint8Array;
}

/** Mint a fresh DEK and seal a file clip's metadata under it, returning the DEK
 *  so the caller can chunk-encrypt the file bytes with the same key. The content
 *  itself is uploaded to R2 separately (never sealed inline). */
export async function sealClipFileMeta(metadata: ClipMetadata): Promise<SealedFileMeta> {
  const dek = await generateKey();
  const sealedMeta = await encryptWith(dek, encodeMetadata(metadata));
  const { wrapped, iv } = await wrapDek(dek);
  return { dek, wrappedDek: wrapped, wrappedDekIv: iv, encryptedMetadata: sealedMeta };
}

async function encryptWith(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const { iv, ciphertext } = await encrypt(key, plaintext);
  return packEnvelope(iv, ciphertext);
}

async function decryptEnvelope(key: Uint8Array, envelope: Uint8Array): Promise<Uint8Array> {
  const { iv, ciphertext } = unpackEnvelope(envelope);
  return decrypt(key, ciphertext, iv);
}
