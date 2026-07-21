// Shared client-side share creation for Link (Mode 1) and PIN (Mode 2).
//
// Both the composer and Sync reshare produce these the same way: a fresh
// random content key encrypts the content + metadata in the worker, the
// envelope is posted, and a shareable artifact (URL / PIN) comes back. Content
// over the inline cap is chunk-encrypted straight to R2 instead; the create
// body then references the storage key rather than carrying ciphertext.

import type { ClipMetadata } from "@/lib/clip/metadata";
import { encrypt, generateKey } from "@/lib/crypto/client";
import { base64Encode, base64urlEncode, packEnvelope } from "@/lib/crypto/encoding";
import { env } from "@/lib/env";
import { uploadEncryptedFile } from "@/lib/files/upload";

export type ShareContentType = "text" | "code" | "url" | "file";

// Content at or below this stays inline in the row; larger goes to R2 as
// 1 MiB chunks. Matches the API's inline ciphertext ceiling.
export const INLINE_MAX_BYTES = 256 * 1024;

export interface PasswordGate {
  passwordHash: string;
  passwordSalt: string;
}

interface CommonOptions {
  ttlSeconds: number;
  password?: PasswordGate | undefined;
  onProgress?: ((fraction: number) => void) | undefined;
}

export interface LinkShareResult {
  id: string;
  url: string;
  expiresAt: Date;
}

export interface PinShareResult {
  id: string;
  pin: string;
  url: string;
  expiresAt: Date;
}

// The content half of a create body: either inline ciphertext, or a reference
// to the R2 chunk objects. Spread straight into the POST payload.
type ContentWire = { ciphertext: string } | { storage_object_key: string; chunk_count: number };

interface Sealed {
  key: Uint8Array;
  metadataB64: string;
  wire: ContentWire;
}

async function sealContent(
  contentBytes: Uint8Array,
  metadata: ClipMetadata,
  onProgress?: (fraction: number) => void,
): Promise<Sealed> {
  const key = await generateKey();
  const meta = await encrypt(key, new TextEncoder().encode(JSON.stringify(metadata)));
  const metadataB64 = base64Encode(packEnvelope(meta.iv, meta.ciphertext));

  if (contentBytes.byteLength > INLINE_MAX_BYTES) {
    const { storageObjectKey, chunkCount } = await uploadEncryptedFile(
      key,
      contentBytes,
      onProgress,
    );
    return {
      key,
      metadataB64,
      wire: { storage_object_key: storageObjectKey, chunk_count: chunkCount },
    };
  }

  const content = await encrypt(key, contentBytes);
  return {
    key,
    metadataB64,
    wire: { ciphertext: base64Encode(packEnvelope(content.iv, content.ciphertext)) },
  };
}

function passwordFields(password: PasswordGate | undefined): Record<string, string> {
  return password
    ? { password_hash: password.passwordHash, password_salt: password.passwordSalt }
    : {};
}

async function detail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? ` — ${body.detail}` : "";
  } catch {
    return "";
  }
}

/** Create a one-shot Link (Mode 1). The key lives only in the returned URL
 *  fragment; the server never sees it. */
export async function createLinkShare(
  contentType: ShareContentType,
  contentBytes: Uint8Array,
  metadata: ClipMetadata,
  opts: CommonOptions & { maxReads?: number },
): Promise<LinkShareResult> {
  const sealed = await sealContent(contentBytes, metadata, opts.onProgress);
  const response = await fetch(`${env.apiBaseUrl}/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      share_mode: "link",
      content_type: contentType,
      ...sealed.wire,
      encrypted_metadata: sealed.metadataB64,
      ttl_seconds: opts.ttlSeconds,
      max_reads: opts.maxReads ?? 1,
      ...passwordFields(opts.password),
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}${await detail(response)}`);
  }
  const { id, expires_at } = (await response.json()) as { id: string; expires_at: string };
  return {
    id,
    url: `${window.location.origin}/s/${id}#k=${base64urlEncode(sealed.key)}`,
    expiresAt: new Date(expires_at),
  };
}

/** Create a PIN share (Mode 2). The raw content key travels to the server,
 *  which wraps it at rest — Mode 2 is encryption-at-rest, not zero-knowledge. */
export async function createPinShare(
  contentType: ShareContentType,
  contentBytes: Uint8Array,
  metadata: ClipMetadata,
  opts: CommonOptions & { maxReads: number | null },
): Promise<PinShareResult> {
  const sealed = await sealContent(contentBytes, metadata, opts.onProgress);
  const response = await fetch(`${env.apiBaseUrl}/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      share_mode: "pin_share",
      content_type: contentType,
      ...sealed.wire,
      content_key: base64Encode(sealed.key),
      encrypted_metadata: sealed.metadataB64,
      ttl_seconds: opts.ttlSeconds,
      max_reads: opts.maxReads,
      ...passwordFields(opts.password),
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}${await detail(response)}`);
  }
  const { id, pin, expires_at } = (await response.json()) as {
    id: string;
    pin: string;
    expires_at: string;
  };
  return {
    id,
    pin,
    url: `${window.location.origin}/r?pin=${pin}`,
    expiresAt: new Date(expires_at),
  };
}
