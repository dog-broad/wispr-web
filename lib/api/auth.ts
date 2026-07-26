// Client for the auth surface (magic-link request, verify, logout).
//
// All calls send credentials so the session cookie set by /auth/verify is
// stored and replayed. In dev the API is reached through the same-origin
// /wispr-api rewrite (see .env.local) so the SameSite=Lax cookie is accepted.

import { base64Decode, base64Encode } from "@/lib/crypto/encoding";
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
  // True when the link confirmed an email change rather than a sign-in.
  emailChanged: boolean;
}

/**
 * Consume a magic-link token: the server starts a session and sets the cookie.
 * Throws {@link AuthError} with status 400 when the link is spent or expired.
 */
export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  const response = await fetch(`${env.apiBaseUrl}/auth/verify?token=${encodeURIComponent(token)}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new AuthError(
      (await safeDetail(response)) ?? `${response.status} ${response.statusText}`,
      response.status,
    );
  }
  const body = (await response.json()) as {
    email: string;
    needs_passphrase_setup: boolean;
    email_changed?: boolean;
  };
  return {
    email: body.email,
    needsPassphraseSetup: body.needs_passphrase_setup,
    emailChanged: body.email_changed ?? false,
  };
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

export interface SessionInfo {
  email: string;
  isAdmin: boolean;
  needsPassphraseSetup: boolean;
  masterKeyVersion: number;
  authCredentialSalt: Uint8Array | null;
  masterKeySalt: Uint8Array | null;
}

/** Current auth state + the PBKDF2 salts for re-derivation. Null if not signed in. */
export async function getSession(): Promise<SessionInfo | null> {
  const response = await fetch(`${env.apiBaseUrl}/auth/session`, { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new AuthError(`${response.status} ${response.statusText}`, response.status);
  }
  const body = (await response.json()) as {
    email: string;
    is_admin: boolean;
    needs_passphrase_setup: boolean;
    master_key_version: number;
    auth_credential_salt: string | null;
    master_key_salt: string | null;
  };
  return {
    email: body.email,
    isAdmin: body.is_admin,
    needsPassphraseSetup: body.needs_passphrase_setup,
    masterKeyVersion: body.master_key_version,
    authCredentialSalt: body.auth_credential_salt ? base64Decode(body.auth_credential_salt) : null,
    masterKeySalt: body.master_key_salt ? base64Decode(body.master_key_salt) : null,
  };
}

/** Verify the passphrase for this session. Throws {@link AuthError} 401 on mismatch. */
export async function unlock(authToken: Uint8Array): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/auth/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ auth_token: base64Encode(authToken) }),
  });
  if (!response.ok) {
    throw new AuthError(
      (await safeDetail(response)) ?? `${response.status} ${response.statusText}`,
      response.status,
    );
  }
}

export interface RewrappedDek {
  id: string;
  wrappedDek: Uint8Array;
  wrappedDekIv: Uint8Array;
}

/**
 * Change the passphrase in one atomic server call: the current auth token
 * (re-auth) plus the new credential + every Sync DEK re-wrapped with the new
 * KEK. Throws {@link AuthError}: 401 wrong current passphrase, 423 locked, 409
 * the Sync set drifted mid-change (refetch + retry).
 */
export async function changePassphrase(input: {
  currentAuthToken: Uint8Array;
  newAuthToken: Uint8Array;
  newAuthSalt: Uint8Array;
  newMasterSalt: Uint8Array;
  rewrapped: RewrappedDek[];
}): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/auth/change-passphrase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      current_auth_token: base64Encode(input.currentAuthToken),
      new_auth_token: base64Encode(input.newAuthToken),
      new_auth_credential_salt: base64Encode(input.newAuthSalt),
      new_master_key_salt: base64Encode(input.newMasterSalt),
      rewrapped: input.rewrapped.map((r) => ({
        id: r.id,
        wrapped_dek: base64Encode(r.wrappedDek),
        wrapped_dek_iv: base64Encode(r.wrappedDekIv),
      })),
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
