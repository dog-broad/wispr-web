// Pure WebCrypto wrappers — AES-GCM-256, fresh random IV per encrypt call.
//
// These functions intentionally take and return raw bytes (Uint8Array) so
// they're cheap to ship across the worker boundary and trivial to test in
// isolation. They do not throw on success; the underlying `crypto.subtle`
// rejects with a `OperationError` on tampered ciphertext / wrong key,
// which propagates through unchanged.

const ALGORITHM = "AES-GCM";
const KEY_BYTES = 32;
const IV_BYTES = 12;

export interface EncryptResult {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

/**
 * Cryptographically random 32-byte key suitable for AES-GCM-256. Lives in
 * the URL fragment for Mode 1 (Link) and never touches the server.
 */
export function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEY_BYTES));
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt `plaintext` under `key`. The returned `ciphertext` includes the
 * 16-byte AES-GCM auth tag appended (WebCrypto convention); the receiver
 * must pass the same `iv` to decrypt.
 */
export async function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
): Promise<EncryptResult> {
  if (key.byteLength !== KEY_BYTES) {
    throw new Error(`encrypt: key must be ${KEY_BYTES} bytes (got ${key.byteLength})`);
  }
  const cryptoKey = await importAesKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    cryptoKey,
    plaintext,
  );
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

/**
 * Decrypt `ciphertext` under `key` with the given `iv`. Rejects (with the
 * underlying WebCrypto `OperationError`) when the auth tag fails to
 * verify — i.e. the key is wrong, the ciphertext was tampered with, or
 * the IV does not match the one used at encrypt time.
 */
export async function decrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  if (key.byteLength !== KEY_BYTES) {
    throw new Error(`decrypt: key must be ${KEY_BYTES} bytes (got ${key.byteLength})`);
  }
  if (iv.byteLength !== IV_BYTES) {
    throw new Error(`decrypt: iv must be ${IV_BYTES} bytes (got ${iv.byteLength})`);
  }
  const cryptoKey = await importAesKey(key);
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    cryptoKey,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}
