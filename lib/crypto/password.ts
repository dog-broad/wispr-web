// PBKDF2 helper for the Link password gate.
//
// This isn't part of the content-encryption path; the snippet's
// AES-GCM key still lives in the URL fragment. The password is a
// separate access-control gate the server enforces with a
// constant-time hash compare. Doing the PBKDF2 client-side means the
// raw password never leaves the tab.

const PBKDF2_ITERATIONS = 100_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

export const PASSWORD_HASH_BYTES = HASH_BYTES;
export const PASSWORD_SALT_BYTES = SALT_BYTES;

/** Fresh 16-byte random salt, one per snippet at create time. */
export function generatePasswordSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/** Derive the 32-byte password hash via PBKDF2-SHA-256 with 100 000
 *  iterations. Same parameters both at create time (where the client
 *  generates the salt) and at verify time (where the server returns
 *  the snippet's stored salt). */
export async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    HASH_BYTES * 8,
  );
  return new Uint8Array(derived);
}
