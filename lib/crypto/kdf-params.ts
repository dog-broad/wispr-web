// Shared KDF parameters for the account passphrase (main-thread-safe: no key
// state lives here). Two independent PBKDF2 chains from the same passphrase:
// an auth token the server verifies, and the master KEK that wraps Sync DEKs.
// Independence comes from different iteration counts, salts, and domain labels.

export const AUTH_KDF = {
  iterations: 100_000,
  saltBytes: 16,
  label: "wispr-auth-v1",
  tokenBytes: 32,
} as const;

export const MASTER_KDF = {
  iterations: 600_000,
  saltBytes: 16,
  label: "wispr-master-v1",
} as const;

export function generateAuthSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(AUTH_KDF.saltBytes));
}

export function generateMasterSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(MASTER_KDF.saltBytes));
}

/**
 * PBKDF2 has no info/label parameter, so domain-separate by prefixing the
 * label bytes to the random salt: `effective_salt = utf8(label) || salt`.
 * Deterministic across setup and later prompts for the same (label, salt).
 */
export function labeledSalt(label: string, salt: Uint8Array): Uint8Array {
  const labelBytes = new TextEncoder().encode(label);
  const out = new Uint8Array(labelBytes.length + salt.length);
  out.set(labelBytes, 0);
  out.set(salt, labelBytes.length);
  return out;
}
