import { describe, expect, test } from "vitest";
import { decrypt, encrypt, generateKey } from "./primitives";

const utf8 = new TextEncoder();
const utf8Decode = new TextDecoder();

describe("generateKey", () => {
  test("returns 32 random bytes", () => {
    const a = generateKey();
    expect(a.byteLength).toBe(32);
  });

  test("returns a different key on each call", () => {
    const a = generateKey();
    const b = generateKey();
    expect(a).not.toEqual(b);
  });
});

describe("encrypt + decrypt round-trip", () => {
  test("preserves the plaintext exactly", async () => {
    const key = generateKey();
    const plaintext = utf8.encode("Hello, ζω 世界 🌸");
    const { ciphertext, iv } = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, ciphertext, iv);
    expect(utf8Decode.decode(decrypted)).toBe("Hello, ζω 世界 🌸");
  });

  test("handles empty plaintext", async () => {
    const key = generateKey();
    const { ciphertext, iv } = await encrypt(key, new Uint8Array(0));
    const decrypted = await decrypt(key, ciphertext, iv);
    expect(decrypted.byteLength).toBe(0);
  });

  test("produces a fresh IV on every call", async () => {
    const key = generateKey();
    const pt = utf8.encode("same input twice");
    const a = await encrypt(key, pt);
    const b = await encrypt(key, pt);
    expect(a.iv).not.toEqual(b.iv);
    expect(a.ciphertext).not.toEqual(b.ciphertext);
  });

  test("returns a 12-byte IV", async () => {
    const key = generateKey();
    const { iv } = await encrypt(key, utf8.encode("anything"));
    expect(iv.byteLength).toBe(12);
  });
});

describe("decrypt", () => {
  test("rejects with the wrong key", async () => {
    const key = generateKey();
    const other = generateKey();
    const { ciphertext, iv } = await encrypt(key, utf8.encode("secret"));
    await expect(decrypt(other, ciphertext, iv)).rejects.toThrow();
  });

  test("rejects when the ciphertext has been tampered with", async () => {
    const key = generateKey();
    const { ciphertext, iv } = await encrypt(key, utf8.encode("secret"));
    ciphertext[0] = ciphertext[0]! ^ 0xff;
    await expect(decrypt(key, ciphertext, iv)).rejects.toThrow();
  });

  test("rejects when the IV has been swapped", async () => {
    const key = generateKey();
    const { ciphertext } = await encrypt(key, utf8.encode("secret"));
    const wrongIv = crypto.getRandomValues(new Uint8Array(12));
    await expect(decrypt(key, ciphertext, wrongIv)).rejects.toThrow();
  });
});

describe("input validation", () => {
  test("encrypt rejects wrong-sized keys", async () => {
    await expect(
      encrypt(new Uint8Array(16), utf8.encode("x")),
    ).rejects.toThrow(/key must be 32 bytes/);
  });

  test("decrypt rejects wrong-sized keys", async () => {
    const key = generateKey();
    const { ciphertext, iv } = await encrypt(key, utf8.encode("x"));
    await expect(decrypt(new Uint8Array(16), ciphertext, iv)).rejects.toThrow(
      /key must be 32 bytes/,
    );
  });

  test("decrypt rejects wrong-sized IV", async () => {
    const key = generateKey();
    const { ciphertext } = await encrypt(key, utf8.encode("x"));
    await expect(decrypt(key, ciphertext, new Uint8Array(8))).rejects.toThrow(
      /iv must be 12 bytes/,
    );
  });
});
