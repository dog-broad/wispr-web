// Client for the PIN surfaces: resolve a PIN at /r, and manage an owned PIN
// share (rotate / delete) from the sent state.

import { base64Decode, base64Encode } from "@/lib/crypto/encoding";
import { env } from "@/lib/env";

export type PinGoneReason = "expired" | "burned" | "taken_down" | "disabled";

export interface PinShareData {
  id: string;
  contentType: "text" | "code" | "url" | "file";
  contentKey: Uint8Array;
  ciphertext: Uint8Array;
  encryptedMetadata: Uint8Array;
  maxReads: number | null;
  readCount: number;
  // File-backed shares: presigned GET per R2 chunk instead of inline ciphertext.
  downloadUrls?: string[];
}

// Every distinct /r outcome — the resolve cases plus pair + Turnstile — as a
// tagged union so the receiver renders each with dedicated copy: no generic fall.
export type ByPinResult =
  | { kind: "pin_share"; data: PinShareData }
  | { kind: "pair" }
  | { kind: "password_required"; salt: Uint8Array }
  | { kind: "password_incorrect" }
  | { kind: "gone"; reason: PinGoneReason }
  | { kind: "unknown_pin" }
  | { kind: "turnstile_required" }
  | { kind: "turnstile_failed" }
  | { kind: "error" };

export async function resolveByPin(
  pin: string,
  opts: { passwordHash?: Uint8Array; turnstileToken?: string } = {},
): Promise<ByPinResult> {
  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/snippets/by-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        password_hash: opts.passwordHash ? base64Encode(opts.passwordHash) : null,
        turnstile_token: opts.turnstileToken ?? null,
      }),
    });
  } catch {
    return { kind: "error" };
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (response.status === 200) {
    if (body.mode === "pair") return { kind: "pair" };
    return {
      kind: "pin_share",
      data: {
        id: String(body.id),
        contentType: body.content_type as PinShareData["contentType"],
        contentKey: base64Decode(String(body.content_key)),
        ciphertext: base64Decode(String(body.ciphertext)),
        encryptedMetadata: base64Decode(String(body.encrypted_metadata)),
        maxReads: body.max_reads === null ? null : Number(body.max_reads),
        readCount: Number(body.read_count),
        ...(Array.isArray(body.download_urls)
          ? { downloadUrls: body.download_urls.map(String) }
          : {}),
      },
    };
  }
  if (response.status === 401) {
    if (body.status === "password_required") {
      return { kind: "password_required", salt: base64Decode(String(body.password_salt)) };
    }
    return { kind: "password_incorrect" };
  }
  if (response.status === 410) return { kind: "gone", reason: body.reason as PinGoneReason };
  if (response.status === 404) return { kind: "unknown_pin" };
  if (response.status === 403) return { kind: "turnstile_required" };
  if (response.status === 400 && body.reason === "turnstile_failed") {
    return { kind: "turnstile_failed" };
  }
  return { kind: "error" };
}

/** Issue a fresh PIN for an owned share. Returns the new PIN. */
export async function rotatePin(id: string): Promise<string> {
  const response = await fetch(`${env.apiBaseUrl}/me/snippets/${id}/rotate-pin`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error(`rotate failed: ${response.status}`);
  return String(((await response.json()) as { pin: string }).pin);
}

/** Hard-delete an owned share (delete now). A 404 means it's already gone. */
export async function deleteSnippet(id: string): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/me/snippets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`delete failed: ${response.status}`);
  }
}
