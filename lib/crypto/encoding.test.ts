import { describe, expect, test } from "vitest";
import {
  base64Decode,
  base64Encode,
  base64urlDecode,
  base64urlEncode,
  packEnvelope,
  unpackEnvelope,
} from "./encoding";

const sampleBytes = (length: number): Uint8Array => {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = (i * 37) & 0xff;
  return out;
};

describe("base64url", () => {
  test("round-trips arbitrary bytes", () => {
    const bytes = sampleBytes(64);
    expect(base64urlDecode(base64urlEncode(bytes))).toEqual(bytes);
  });

  test("uses the URL-safe alphabet — no +, /, or =", () => {
    // 0xfb 0xff 0xbf in standard base64 contains '+', '/', and pads to '=='
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]);
    const encoded = base64urlEncode(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(base64urlDecode(encoded)).toEqual(bytes);
  });

  test("handles inputs of every modulo-3 length", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 31, 32, 33]) {
      const bytes = sampleBytes(length);
      expect(base64urlDecode(base64urlEncode(bytes))).toEqual(bytes);
    }
  });

  test("decodes without explicit padding", () => {
    // base64url omits '='; decode must restore it
    const bytes = sampleBytes(32);
    const encoded = base64urlEncode(bytes);
    expect(encoded).not.toContain("=");
    expect(base64urlDecode(encoded)).toEqual(bytes);
  });
});

describe("standard base64", () => {
  test("round-trips arbitrary bytes", () => {
    const bytes = sampleBytes(40);
    expect(base64Decode(base64Encode(bytes))).toEqual(bytes);
  });
});

describe("envelope", () => {
  test("packs iv || ciphertext", () => {
    const iv = sampleBytes(12);
    const ciphertext = sampleBytes(20);
    const env = packEnvelope(iv, ciphertext);
    expect(env.byteLength).toBe(32);
    expect(env.slice(0, 12)).toEqual(iv);
    expect(env.slice(12)).toEqual(ciphertext);
  });

  test("round-trips through unpack", () => {
    const iv = sampleBytes(12);
    const ciphertext = sampleBytes(50);
    const unpacked = unpackEnvelope(packEnvelope(iv, ciphertext));
    expect(unpacked.iv).toEqual(iv);
    expect(unpacked.ciphertext).toEqual(ciphertext);
  });

  test("rejects wrong-sized IV at pack time", () => {
    expect(() => packEnvelope(sampleBytes(8), sampleBytes(10))).toThrow(/iv must be 12 bytes/);
  });

  test("rejects too-short envelope at unpack time", () => {
    expect(() => unpackEnvelope(sampleBytes(12))).toThrow(/envelope too short/);
    expect(() => unpackEnvelope(sampleBytes(0))).toThrow(/envelope too short/);
  });
});
