// Client for the auth surface (magic-link request, verify, logout).
//
// All calls send credentials so the session cookie set by /auth/verify is
// stored and replayed. In dev the API is reached through the same-origin
// /wispr-api rewrite (see .env.local) so the SameSite=Lax cookie is accepted.

import { base64Encode } from "@/lib/crypto/encoding";
import { env } from "@/lib/env";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface RequestMagicLinkInput {
  email: string;
  inviteCode?: string | undefined;
  turnstileToken?: string | undefined;
}

/**
 * Ask for a magic link. Resolves on the always-200 anti-enumeration success
 * (the caller shows "check your email" regardless of whether the address maps
 * to an account). Throws {@link AuthError} on a human-verification failure
 * (400) or when rate-limited (429).
 */
export async function requestMagicLink(input: RequestMagicLinkInput): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/auth/request-magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: input.email,
      invite_code: input.inviteCode || null,
      turnstile_token: input.turnstileToken || null,
    }),
  });
  if (!response.ok) {
    throw new AuthError(
      (await safeDetail(response)) ?? `${response.status} ${response.statusText}`,
      response.status,
    );
  }
}

export interface VerifyResult {
  email: string;
  needsPassphraseSetup: boolean;
}

/**
 * Consume a magic-link token: the server starts a session and sets the cookie.
 * Throws {@link AuthError} with status 400 when the link is spent or expired.
 */
export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  const response = await fetch(
    `${env.apiBaseUrl}/auth/verify?token=${encodeURIComponent(token)}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new AuthError(
      (await safeDetail(response)) ?? `${response.status} ${response.statusText}`,
      response.status,
    );
  }
  const body = (await response.json()) as {
    email: string;
    needs_passphrase_setup: boolean;
  };
  return { email: body.email, needsPassphraseSetup: body.needs_passphrase_setup };
}

/**
 * First-time passphrase setup. Sends the client-derived auth token and the two
 * PBKDF2 salts; the passphrase and master key never leave the browser. Throws
 * {@link AuthError} 409 if a passphrase is already set, 401 if not signed in.
 */
export async function setupPassphrase(
  authToken: Uint8Array,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/auth/setup-passphrase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      auth_token: base64Encode(authToken),
      auth_credential_salt: base64Encode(authSalt),
      master_key_salt: base64Encode(masterSalt),
    }),
  });
  if (!response.ok) {
    throw new AuthError(
      (await safeDetail(response)) ?? `${response.status} ${response.statusText}`,
      response.status,
    );
  }
}

/** Invalidate the current session and clear the cookie. Idempotent. */
export async function logout(): Promise<void> {
  await fetch(`${env.apiBaseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

async function safeDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown; reason?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.reason === "string") return body.reason;
    return null;
  } catch {
    return null;
  }
}
