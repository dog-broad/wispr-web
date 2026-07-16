// Master-key state — imported ONLY by the crypto Web Worker so the KEK lives
// in worker memory and never crosses to the main thread.
//
// The master KEK is a non-extractable AES-GCM CryptoKey: page script can never
// read its raw bytes. It wraps/unwraps per-snippet DEKs (which do transit the
// main thread — bounded, per-item exposure, never the master key).

import { AUTH_KDF, MASTER_KDF, labeledSalt } from "./kdf-params";

const IV_BYTES = 12;

let masterKek: CryptoKey | null = null;

async function importPassphrase(passphrase: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
}

/**
 * Derive both chains from the passphrase. The master KEK is imported as a
 * non-extractable key and held in module state; the auth token is returned so
 * the caller can send it to the server (setup) or discard it (prompt).
 */
export async function deriveKeys(
  passphrase: string,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
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
  masterKek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: labeledSalt(MASTER_KDF.label, masterSalt),
      iterations: MASTER_KDF.iterations,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable — raw KEK bytes never leave the worker
    ["encrypt", "decrypt"],
  );
  return { authToken: new Uint8Array(authBits) };
}

function requireKek(): CryptoKey {
  if (masterKek === null) {
    throw new Error("master key not derived — passphrase required");
  }
  return masterKek;
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

/** Drop the KEK from memory — on lock, logout, or tab close. */
export function clear(): void {
  masterKek = null;
}

export function hasKeys(): boolean {
  return masterKek !== null;
}
