// Byte-blob helpers for the Wispr wire format.
//
// The URL fragment uses base64url (RFC 4648 §5) with the URL-safe
// alphabet and stripped padding: short, copy-safe, no special
// characters that browsers might encode further.
//
// On-the-wire ciphertext columns carry an "envelope": the 12-byte
// AES-GCM IV concatenated with the ciphertext + AEAD tag. Server stores
// the blob opaquely; the receiver splits the IV off the front before
// passing the rest to `crypto.decrypt`.

const IV_BYTES = 12;

// ---------- base64url --------------------------------------------------

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64urlDecode(input: string): Uint8Array {
  const padded =
    input.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

// ---------- envelope --------------------------------------------------

/** Concatenate `iv || ciphertext` into a single transport blob. */
export function packEnvelope(iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (iv.byteLength !== IV_BYTES) {
    throw new Error(`packEnvelope: iv must be ${IV_BYTES} bytes (got ${iv.byteLength})`);
  }
  const out = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  out.set(iv, 0);
  out.set(ciphertext, iv.byteLength);
  return out;
}

/** Split a transport blob back into iv + ciphertext. Throws if the blob
 *  is too short to contain a full IV. */
export function unpackEnvelope(envelope: Uint8Array): {
  iv: Uint8Array;
  ciphertext: Uint8Array;
} {
  if (envelope.byteLength <= IV_BYTES) {
    throw new Error(
      `unpackEnvelope: envelope too short, need > ${IV_BYTES} bytes, got ${envelope.byteLength}`,
    );
  }
  return {
    iv: envelope.slice(0, IV_BYTES),
    ciphertext: envelope.slice(IV_BYTES),
  };
}

// ---------- standard base64 (for JSON payloads to the api) -----------

export function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64Decode(input: string): Uint8Array {
  const binary = atob(input);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
