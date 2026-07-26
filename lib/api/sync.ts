// Client for the Sync feed surface: list the caller's clips (keyset
// paginated), create a new clip, and delete one. All calls send the session
// cookie. Bytes fields arrive base64 and are decoded to Uint8Array here so
// callers work in bytes, never strings.

import { base64Decode, base64Encode } from "@/lib/crypto/encoding";
import { env } from "@/lib/env";
import type { SealedClip } from "@/lib/sync/clip";

export type ClipContentType = "text" | "code" | "url" | "file";

export interface SyncItem {
  id: string;
  contentType: ClipContentType;
  // Empty for a file-backed clip — its bytes live in R2 (chunkCount objects),
  // fetched on demand via fetchSyncFileUrls.
  ciphertext: Uint8Array;
  wrappedDek: Uint8Array;
  wrappedDekIv: Uint8Array;
  encryptedMetadata: Uint8Array;
  sizeBytes: number;
  createdAt: string;
  // Non-null iff the content is stored in R2 rather than inline.
  chunkCount: number | null;
}

export interface SyncPage {
  items: SyncItem[];
  // ISO timestamp cursor: pass as ?before= for the next (older) page, or null
  // when this is the last page.
  nextBefore: string | null;
}

interface SyncItemWire {
  id: string;
  content_type: ClipContentType;
  ciphertext: string;
  wrapped_dek: string;
  wrapped_dek_iv: string;
  encrypted_metadata: string;
  size_bytes: number;
  created_at: string;
  chunk_count: number | null;
}

function decodeItem(wire: SyncItemWire): SyncItem {
  return {
    id: wire.id,
    contentType: wire.content_type,
    ciphertext: base64Decode(wire.ciphertext),
    wrappedDek: base64Decode(wire.wrapped_dek),
    wrappedDekIv: base64Decode(wire.wrapped_dek_iv),
    encryptedMetadata: base64Decode(wire.encrypted_metadata),
    sizeBytes: wire.size_bytes,
    createdAt: wire.created_at,
    chunkCount: wire.chunk_count ?? null,
  };
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

/** Fetch a page of the caller's Sync feed, newest first. Throws
 *  {@link SyncError} 401 when not signed in. */
export async function listSyncSnippets(before?: string): Promise<SyncPage> {
  const url = new URL(`${env.apiBaseUrl}/me/snippets`, window.location.origin);
  if (before) url.searchParams.set("before", before);
  const response = await fetch(url.toString(), { credentials: "include" });
  if (!response.ok) {
    throw new SyncError(`${response.status} ${response.statusText}`, response.status);
  }
  const body = (await response.json()) as { items: SyncItemWire[]; next_before: string | null };
  return { items: body.items.map(decodeItem), nextBefore: body.next_before };
}

/** Create a Sync clip from an already-sealed envelope. Returns the new id. */
export async function createSyncSnippet(
  contentType: ClipContentType,
  sealed: SealedClip,
): Promise<string> {
  const response = await fetch(`${env.apiBaseUrl}/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      share_mode: "sync",
      content_type: contentType,
      ciphertext: base64Encode(sealed.ciphertext),
      wrapped_dek: base64Encode(sealed.wrappedDek),
      wrapped_dek_iv: base64Encode(sealed.wrappedDekIv),
      encrypted_metadata: base64Encode(sealed.encryptedMetadata),
    }),
  });
  if (!response.ok) {
    throw new SyncError(`${response.status} ${response.statusText}`, response.status);
  }
  return String(((await response.json()) as { id: string }).id);
}

/** A file clip whose bytes were already chunk-uploaded to R2. The wire body
 *  carries the storage key + wrapped DEK instead of inline ciphertext. */
export interface SealedFileClip {
  storageObjectKey: string;
  chunkCount: number;
  wrappedDek: Uint8Array;
  wrappedDekIv: Uint8Array;
  encryptedMetadata: Uint8Array;
}

/** Finalize a file-backed Sync clip (bytes already in R2). Returns the id. */
export async function createSyncFileSnippet(sealed: SealedFileClip): Promise<string> {
  const response = await fetch(`${env.apiBaseUrl}/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      share_mode: "sync",
      content_type: "file",
      storage_object_key: sealed.storageObjectKey,
      chunk_count: sealed.chunkCount,
      wrapped_dek: base64Encode(sealed.wrappedDek),
      wrapped_dek_iv: base64Encode(sealed.wrappedDekIv),
      encrypted_metadata: base64Encode(sealed.encryptedMetadata),
    }),
  });
  if (!response.ok) {
    throw new SyncError(`${response.status} ${response.statusText}`, response.status);
  }
  return String(((await response.json()) as { id: string }).id);
}

/** Presigned GET URL per chunk for an owned storage-backed clip, fetched lazily
 *  when the user downloads it. */
export async function fetchSyncFileUrls(id: string): Promise<string[]> {
  const response = await fetch(`${env.apiBaseUrl}/me/snippets/${id}/file`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new SyncError(`${response.status} ${response.statusText}`, response.status);
  }
  return ((await response.json()) as { download_urls: string[] }).download_urls;
}
