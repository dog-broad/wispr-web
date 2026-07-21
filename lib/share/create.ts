// Shared client-side share creation for Link (Mode 1) and PIN (Mode 2).
//
// Both the composer and Sync reshare produce these the same way: a fresh
// random content key encrypts the content + metadata in the worker, the
// envelope is posted, and a shareable artifact (URL / PIN) comes back. Keeping
// this in one place means the zero-knowledge envelope logic has a single
// definition rather than diverging copies.

import type { ClipMetadata } from "@/lib/clip/metadata";
import { encrypt, generateKey } from "@/lib/crypto/client";
import { base64Encode, base64urlEncode, packEnvelope } from "@/lib/crypto/encoding";
import { env } from "@/lib/env";

export type ShareContentType = "text" | "code" | "url" | "file";

export interface PasswordGate {
  passwordHash: string;
  passwordSalt: string;
}

interface CommonOptions {
  ttlSeconds: number;
  password?: PasswordGate | undefined;
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

async function sealEnvelopes(
  contentBytes: Uint8Array,
  metadata: ClipMetadata,
): Promise<{ key: Uint8Array; ciphertextB64: string; metadataB64: string }> {
  const key = await generateKey();
  const content = await encrypt(key, contentBytes);
  const meta = await encrypt(key, new TextEncoder().encode(JSON.stringify(metadata)));
  return {
    key,
    ciphertextB64: base64Encode(packEnvelope(content.iv, content.ciphertext)),
    metadataB64: base64Encode(packEnvelope(meta.iv, meta.ciphertext)),
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
  const { key, ciphertextB64, metadataB64 } = await sealEnvelopes(contentBytes, metadata);
  const response = await fetch(`${env.apiBaseUrl}/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      share_mode: "link",
      content_type: contentType,
      ciphertext: ciphertextB64,
      encrypted_metadata: metadataB64,
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
    url: `${window.location.origin}/s/${id}#k=${base64urlEncode(key)}`,
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
  const { key, ciphertextB64, metadataB64 } = await sealEnvelopes(contentBytes, metadata);
  const response = await fetch(`${env.apiBaseUrl}/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      share_mode: "pin_share",
      content_type: contentType,
      ciphertext: ciphertextB64,
      content_key: base64Encode(key),
      encrypted_metadata: metadataB64,
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
