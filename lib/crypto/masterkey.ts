// Master-key state — imported ONLY by the crypto Web Worker so the KEK lives
// in worker memory and never crosses to the main thread.
//
// The master KEK is a non-extractable AES-GCM CryptoKey: page script can never
// read its raw bytes. It wraps/unwraps per-snippet DEKs (which do transit the
// main thread: bounded, per-item exposure, never the master key).
//
// During a passphrase change we hold a second "next" KEK alongside the current
// one so DEKs can be re-wrapped (unwrap with current, wrap with next) before
// the change is committed; on success the next KEK is promoted to current.

import { AUTH_KDF, MASTER_KDF, labeledSalt } from "./kdf-params";

const IV_BYTES = 12;

let masterKek: CryptoKey | null = null;
let nextKek: CryptoKey | null = null;

async function importPassphrase(passphrase: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveBits",
    "deriveKey",
  ]);
}

/** Run both KDF chains from a passphrase: return the auth token (leaves the
 *  worker) and the non-extractable master KEK (stays in the worker). */
async function deriveChains(
  passphrase: string,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
): Promise<{ authToken: Uint8Array; kek: CryptoKey }> {
  const material = await importPassphrase(passphrase);
  const authBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: labeledSalt(AUTH_KDF.label, authSalt),
      iterations: AUTH_KDF.iterations,
    },
    material,
    AUTH_KDF.tokenBytes * 8,
  );
  const kek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: labeledSalt(MASTER_KDF.label, masterSalt),
      iterations: MASTER_KDF.iterations,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable: raw KEK bytes never leave the worker
    ["encrypt", "decrypt"],
  );
  return { authToken: new Uint8Array(authBits), kek };
}

/**
 * Derive both chains from the passphrase. The master KEK is held in module
 * state; the auth token is returned so the caller can send it to the server
 * (setup / unlock) or discard it.
 */
export async function deriveKeys(
  passphrase: string,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
): Promise<{ authToken: Uint8Array }> {
  const { authToken, kek } = await deriveChains(passphrase, authSalt, masterSalt);
  masterKek = kek;
  return { authToken };
}

/** Derive only the auth token from a passphrase (no KEK side effects). Used
 *  for re-auth (proving the current passphrase) without disturbing the held
 *  master KEK, so a wrong guess can't clobber an unlocked session. */
export async function deriveAuthToken(
  passphrase: string,
  authSalt: Uint8Array,
): Promise<{ authToken: Uint8Array }> {
  const material = await importPassphrase(passphrase);
  const authBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: labeledSalt(AUTH_KDF.label, authSalt),
      iterations: AUTH_KDF.iterations,
    },
    material,
    AUTH_KDF.tokenBytes * 8,
  );
  return { authToken: new Uint8Array(authBits) };
}

/** Derive a *second* KEK from a new passphrase and hold it as the pending
 *  "next" key (current stays put). Returns the new auth token for the server. */
export async function deriveNext(
  passphrase: string,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
): Promise<{ authToken: Uint8Array }> {
  const { authToken, kek } = await deriveChains(passphrase, authSalt, masterSalt);
  nextKek = kek;
  return { authToken };
}

function requireKek(): CryptoKey {
  if (masterKek === null) {
    throw new Error("master key not derived, passphrase required");
  }
  return masterKek;
}

function requireNext(): CryptoKey {
  if (nextKek === null) {
    throw new Error("next key not derived, begin a passphrase change first");
  }
  return nextKek;
}

/** Wrap a per-snippet DEK with the held master KEK (AES-GCM, fresh IV). */
export async function wrap(dek: Uint8Array): Promise<{ wrapped: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, requireKek(), dek);
  return { wrapped: new Uint8Array(wrapped), iv };
}

/** Unwrap a DEK previously wrapped with this KEK. Rejects on wrong key/IV. */
export async function unwrap(wrapped: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const dek = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, requireKek(), wrapped);
  return new Uint8Array(dek);
}

/** Re-wrap a DEK from the current KEK to the pending next KEK: unwrap with the
 *  current, wrap with the next, all inside the worker. Used per Sync item
 *  during a passphrase change. */
export async function rewrapToNext(
  wrapped: Uint8Array,
  iv: Uint8Array,
): Promise<{ wrapped: Uint8Array; iv: Uint8Array }> {
  const dek = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, requireKek(), wrapped),
  );
  const nextIv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const rewrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nextIv },
    requireNext(),
    dek,
  );
  return { wrapped: new Uint8Array(rewrapped), iv: nextIv };
}

/** Promote the next KEK to current (call after the server accepts the change). */
export function commitNext(): void {
  if (nextKek === null) return;
  masterKek = nextKek;
  nextKek = null;
}

/** Drop the pending next KEK (call if the change fails). */
export function discardNext(): void {
  nextKek = null;
}

/** Drop all key material from memory (on lock, logout, or tab close). */
export function clear(): void {
  masterKek = null;
  nextKek = null;
}

export function hasKeys(): boolean {
  return masterKek !== null;
}
