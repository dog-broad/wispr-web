import { describe, expect, it } from "vitest";

import {
  PASSWORD_HASH_BYTES,
  PASSWORD_SALT_BYTES,
  derivePasswordHash,
  generatePasswordSalt,
} from "./password";

describe("crypto/password", () => {
  it("salt has the documented byte length", () => {
    const salt = generatePasswordSalt();
    expect(salt.byteLength).toBe(PASSWORD_SALT_BYTES);
  });

  it("hash output has the documented byte length", async () => {
    const hash = await derivePasswordHash("hunter2", generatePasswordSalt());
    expect(hash.byteLength).toBe(PASSWORD_HASH_BYTES);
  });

  it("same password + salt produces the same hash", async () => {
    const salt = generatePasswordSalt();
    const a = await derivePasswordHash("hunter2", salt);
    const b = await derivePasswordHash("hunter2", salt);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("different salt produces a different hash for the same password", async () => {
    const saltA = generatePasswordSalt();
    const saltB = generatePasswordSalt();
    const a = await derivePasswordHash("hunter2", saltA);
    const b = await derivePasswordHash("hunter2", saltB);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it("different password produces a different hash for the same salt", async () => {
    const salt = generatePasswordSalt();
    const a = await derivePasswordHash("hunter2", salt);
    const b = await derivePasswordHash("correct horse battery staple", salt);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it("two fresh salts are different (random source check)", () => {
    const a = generatePasswordSalt();
    const b = generatePasswordSalt();
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});
