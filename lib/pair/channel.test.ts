import { describe, expect, it } from "vitest";

import { deriveSessionMaterial, generateEphemeralKeypair } from "./crypto";
import { decryptFrame, encryptText } from "./channel";

async function pair(): Promise<{ aliceKey: CryptoKey; bobKey: CryptoKey }> {
  const alice = await generateEphemeralKeypair();
  const bob = await generateEphemeralKeypair();
  const aliceMaterial = await deriveSessionMaterial(alice.privateKey, bob.publicKey);
  const bobMaterial = await deriveSessionMaterial(bob.privateKey, alice.publicKey);
  return { aliceKey: aliceMaterial.sessionKey, bobKey: bobMaterial.sessionKey };
}

describe("pair/channel codec", () => {
  it("round-trips a text message between peers", async () => {
    const { aliceKey, bobKey } = await pair();
    const wire = await encryptText(aliceKey, "hello bob");
    const decoded = await decryptFrame(bobKey, wire);
    expect(decoded).toEqual({ type: "text", body: "hello bob" });
  });

  it("produces a fresh IV per call (no nonce reuse)", async () => {
    const { aliceKey } = await pair();
    const a = await encryptText(aliceKey, "same message");
    const b = await encryptText(aliceKey, "same message");
    // Frame layout: 12-byte IV || ciphertext. The IVs (and therefore
    // ciphertexts) must differ across calls — reusing an IV with the
    // same key under AES-GCM is catastrophic.
    expect(a.slice(0, 12)).not.toEqual(b.slice(0, 12));
  });

  it("drops tampered ciphertext silently", async () => {
    const { aliceKey, bobKey } = await pair();
    const wire = await encryptText(aliceKey, "secret");
    // Flip a bit in the ciphertext portion (after the 12-byte IV).
    wire[20] = (wire[20] ?? 0) ^ 0x01;
    expect(await decryptFrame(bobKey, wire)).toBeNull();
  });

  it("returns null on truncated frame", async () => {
    const { aliceKey, bobKey } = await pair();
    const wire = await encryptText(aliceKey, "x");
    const truncated = wire.slice(0, 8); // shorter than IV
    expect(await decryptFrame(bobKey, truncated)).toBeNull();
  });

  it("returns null when the peer key is wrong (eavesdropper)", async () => {
    const { aliceKey } = await pair();
    const eve = await generateEphemeralKeypair();
    const bob = await generateEphemeralKeypair();
    const eveMaterial = await deriveSessionMaterial(eve.privateKey, bob.publicKey);
    const wire = await encryptText(aliceKey, "private");
    expect(await decryptFrame(eveMaterial.sessionKey, wire)).toBeNull();
  });

  it("returns null on unknown frame type", async () => {
    const { aliceKey, bobKey } = await pair();
    // Hand-roll a frame with an unrecognized type to confirm the
    // receiver ignores it instead of crashing.
    const plaintext = new TextEncoder().encode(
      JSON.stringify({ type: "future-feature", body: "x" }),
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aliceKey, plaintext),
    );
    const wire = new Uint8Array(iv.byteLength + ct.byteLength);
    wire.set(iv, 0);
    wire.set(ct, iv.byteLength);
    expect(await decryptFrame(bobKey, wire)).toBeNull();
  });
});
