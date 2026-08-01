// ECDH P-256 + HKDF-SHA-256 for the pair signaling layer.
//
// Each peer generates an ephemeral keypair, exchanges raw public keys
// through the signaling relay, and feeds the ECDH shared secret through
// HKDF to derive two things: an AES-GCM-256 session key for the data
// channel, and a short authentication string (SAS) that both peers can
// verify out-of-band against a man-in-the-middle.
//
// Forward secrecy comes for free because the keypairs are ephemeral and
// never persisted. Once the session closes, the data is unrecoverable
// even if both peers' machines are later seized.
//
// The two HKDF labels ("wispr-pair-v1" and "wispr-pair-sas") domain-
// separate the session key from the SAS, so neither output can be
// recovered from the other.

import { base64urlDecode, base64urlEncode } from "@/lib/crypto/encoding";

const ECDH_CURVE = "P-256";
const SESSION_KEY_INFO = "wispr-pair-v1";
const SAS_INFO = "wispr-pair-sas";
const SAS_CHARS = 4;
const SAS_BITS_PER_CHAR = 5;

// Crockford base32: excludes I/L/O/U so SAS reads cleanly over voice
// and never confuses 0/O or 1/I/L. The 32 symbols cover exactly five
// bits each, which lines up with the 20-bit SAS budget from
// [D-0024-01].
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface EphemeralKeypair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SessionMaterial {
  /** AES-GCM-256, non-extractable, encrypt+decrypt. */
  sessionKey: CryptoKey;
  /** 4-char Crockford base32. Same bits on both peers iff no MITM. */
  sas: string;
}

/** Fresh P-256 keypair for a single pair session.
 *
 *  Both halves are generated extractable because the public key must
 *  be raw-exported for transmission and WebCrypto's ECDH keypair
 *  flag is single-valued. The private key is never exported in
 *  practice — it lives only as a CryptoKey reference in tab memory
 *  and is dropped when the session ends or the page unloads.
 */
export async function generateEphemeralKeypair(): Promise<EphemeralKeypair> {
  const pair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

/** Serialise an ECDH public key to a URL-safe base64 string. The "raw"
 *  format is the SEC1 uncompressed point (65 bytes for P-256), the
 *  interoperable on-the-wire shape. */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return base64urlEncode(new Uint8Array(raw));
}

/** Inverse of ``exportPublicKey`` for the peer's key. */
export async function importPeerPublicKey(encoded: string): Promise<CryptoKey> {
  const raw = base64urlDecode(encoded);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false, // peer key never needs to round-trip back out
    [],
  );
}

/** Run ECDH + HKDF to produce the AES-GCM session key and the SAS for
 *  this peer pair. Both peers feed the same shared secret in (different
 *  paths through their own private / peer public keys), so both
 *  reproduce the same session key and the same SAS. Verifying the SAS
 *  out-of-band proves no operator MITM was inserted. */
export async function deriveSessionMaterial(
  ownPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<SessionMaterial> {
  // Raw ECDH agreement → 256 bits of shared entropy. P-256 actually
  // produces a 32-byte x-coordinate, of which the top 256 bits are the
  // canonical shared secret.
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    ownPrivateKey,
    256,
  );

  // Wrap the shared secret as HKDF input keying material. The same
  // handle is used twice with different ``info`` labels to derive the
  // session key and the SAS bits, distinct outputs by domain
  // separation.
  const hkdf = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey", "deriveBits"],
  );

  const encoder = new TextEncoder();
  const emptySalt = new Uint8Array(0);

  const sessionKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: emptySalt,
      info: encoder.encode(SESSION_KEY_INFO),
    },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false, // session key never leaves WebCrypto
    ["encrypt", "decrypt"],
  );

  // 20 bits of SAS = 4 base32 chars. WebCrypto.deriveBits requires a
  // multiple-of-8 length, so we ask for 24 bits (3 bytes) and use the
  // top 20.
  const sasRaw = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: emptySalt,
        info: encoder.encode(SAS_INFO),
      },
      hkdf,
      24,
    ),
  );
  const sas = formatSas(sasRaw);

  return { sessionKey, sas };
}

/** Pack the first 20 bits of ``raw`` into 4 Crockford-base32 chars,
 *  most-significant bits first. Exported for tests. */
export function formatSas(raw: Uint8Array): string {
  if (raw.length < 3) {
    throw new Error("formatSas: need at least 3 bytes of input");
  }
  const high = raw[0]!;
  const mid = raw[1]!;
  const low = raw[2]!;
  // Combine 24 bits, then drop the bottom 4 to land on a clean 20.
  const combined24 = (high << 16) | (mid << 8) | low;
  const value20 = combined24 >>> 4;

  let out = "";
  for (let i = SAS_CHARS - 1; i >= 0; i -= 1) {
    const index = (value20 >>> (i * SAS_BITS_PER_CHAR)) & 0x1f;
    out += CROCKFORD_ALPHABET[index];
  }
  return out;
}
