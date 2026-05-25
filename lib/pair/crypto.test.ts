import { describe, expect, it } from "vitest";

import {
  deriveSessionMaterial,
  exportPublicKey,
  formatSas,
  generateEphemeralKeypair,
  importPeerPublicKey,
} from "./crypto";

describe("pair/crypto", () => {
  it("imported public key produces the same session material as the original", async () => {
    // Peer public keys are imported non-extractable (they can't round-
    // trip back to base64url). The contract that matters is that the
    // imported key behaves identically to the original — same shared
    // secret with any third party's private key, so same SAS.
    const alice = await generateEphemeralKeypair();
    const bob = await generateEphemeralKeypair();
    const aliceEncoded = await exportPublicKey(alice.publicKey);
    const aliceReimported = await importPeerPublicKey(aliceEncoded);

    const viaOriginal = await deriveSessionMaterial(bob.privateKey, alice.publicKey);
    const viaReimported = await deriveSessionMaterial(bob.privateKey, aliceReimported);
    expect(viaOriginal.sas).toBe(viaReimported.sas);
  });

  it("both peers derive the same session key and SAS", async () => {
    const alice = await generateEphemeralKeypair();
    const bob = await generateEphemeralKeypair();

    const aliceMaterial = await deriveSessionMaterial(alice.privateKey, bob.publicKey);
    const bobMaterial = await deriveSessionMaterial(bob.privateKey, alice.publicKey);

    expect(aliceMaterial.sas).toBe(bobMaterial.sas);
    expect(aliceMaterial.sas).toHaveLength(4);
    expect(aliceMaterial.sas).toMatch(/^[0-9A-Z]{4}$/);

    // Verify the AES keys agree by encrypting on one side and
    // decrypting on the other.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode("hello");
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aliceMaterial.sessionKey,
      plaintext,
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      bobMaterial.sessionKey,
      ciphertext,
    );
    expect(new TextDecoder().decode(new Uint8Array(decrypted))).toBe("hello");
  });

  it("different keypairs produce different SAS values", async () => {
    // Sample a handful of pairings and require at least two distinct SAS
    // values — the probability of all 5 colliding randomly on a 20-bit
    // space is ~10⁻²⁰.
    const seen = new Set<string>();
    for (let i = 0; i < 5; i += 1) {
      const a = await generateEphemeralKeypair();
      const b = await generateEphemeralKeypair();
      const { sas } = await deriveSessionMaterial(a.privateKey, b.publicKey);
      seen.add(sas);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("MITM substitution surfaces as a different SAS", async () => {
    const alice = await generateEphemeralKeypair();
    const bob = await generateEphemeralKeypair();
    const mallory = await generateEphemeralKeypair();

    // Alice thinks she's talking to Bob but actually negotiated with
    // Mallory's substituted key.
    const aliceFromMallory = await deriveSessionMaterial(
      alice.privateKey,
      mallory.publicKey,
    );
    // Bob negotiated with Alice's real key (no MITM on Bob's side in
    // this simplified scenario — real MITM would also intercept this).
    const bobFromAlice = await deriveSessionMaterial(
      bob.privateKey,
      alice.publicKey,
    );

    expect(aliceFromMallory.sas).not.toBe(bobFromAlice.sas);
  });

  describe("formatSas", () => {
    it("encodes the top 20 bits as 4 Crockford chars", () => {
      // 0xFF FF F0 → top 20 bits all-1 → "ZZZZ" in Crockford
      expect(formatSas(new Uint8Array([0xff, 0xff, 0xf0]))).toBe("ZZZZ");
    });

    it("encodes all-zero input as 0000", () => {
      expect(formatSas(new Uint8Array([0x00, 0x00, 0x00]))).toBe("0000");
    });

    it("ignores bits past the first 20", () => {
      // The bottom 4 bits of byte 2 are dropped.
      const a = formatSas(new Uint8Array([0x12, 0x34, 0x50]));
      const b = formatSas(new Uint8Array([0x12, 0x34, 0x5f]));
      expect(a).toBe(b);
    });

    it("never emits an I, L, O, or U", () => {
      // Sample many random 20-bit inputs and confirm no excluded letter
      // shows up. The Crockford alphabet doesn't contain those.
      const banned = /[ILOU]/;
      for (let i = 0; i < 200; i += 1) {
        const raw = new Uint8Array(3);
        crypto.getRandomValues(raw);
        expect(formatSas(raw)).not.toMatch(banned);
      }
    });
  });
});
