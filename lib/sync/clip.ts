// Sync (Mode 4) clip envelope: seal for upload, open for display.
//
// Each clip gets a fresh per-snippet DEK. The content and metadata are
// AES-GCM'd under the DEK; the DEK itself is wrapped by the tab's master KEK
// (held only inside the crypto worker). The server therefore stores just the
// ciphertext + the wrapped DEK — never the DEK, never the KEK (zero-knowledge).

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
 *  Rejects if the passphrase isn't unlocked or the KEK doesn't match. */
export async function openClip(item: SyncItem): Promise<OpenedClip> {
  const dek = await unwrapDek(item.wrappedDek, item.wrappedDekIv);
  const content = await decryptEnvelope(dek, item.ciphertext);
  const metaBytes = await decryptEnvelope(dek, item.encryptedMetadata);
  return { content, metadata: decodeMetadata(metaBytes) };
}

async function encryptWith(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const { iv, ciphertext } = await encrypt(key, plaintext);
  return packEnvelope(iv, ciphertext);
}

async function decryptEnvelope(key: Uint8Array, envelope: Uint8Array): Promise<Uint8Array> {
  const { iv, ciphertext } = unpackEnvelope(envelope);
  return decrypt(key, ciphertext, iv);
}
