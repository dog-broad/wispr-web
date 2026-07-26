import { beforeEach, describe, expect, it } from "vitest";

import { AUTH_KDF, generateAuthSalt, generateMasterSalt } from "./kdf-params";
import { clear, deriveKeys, hasKeys, unwrap, wrap } from "./masterkey";

function bytes(a: Uint8Array): number[] {
  return Array.from(a);
}

describe("crypto/masterkey", () => {
  beforeEach(() => clear());

  it("derives an auth token of the documented length and holds the KEK", async () => {
    const { authToken } = await deriveKeys("correct horse", generateAuthSalt(), generateMasterSalt());
    expect(authToken.byteLength).toBe(AUTH_KDF.tokenBytes);
    expect(hasKeys()).toBe(true);
  });

  it("is deterministic: same passphrase + salts produce the same auth token", async () => {
    const authSalt = generateAuthSalt();
    const masterSalt = generateMasterSalt();
    const { authToken: a } = await deriveKeys("pass", authSalt, masterSalt);
    const { authToken: b } = await deriveKeys("pass", authSalt, masterSalt);
    expect(bytes(a)).toEqual(bytes(b));
  });

  it("different passphrase produces a different auth token", async () => {
    const authSalt = generateAuthSalt();
    const masterSalt = generateMasterSalt();
    const { authToken: a } = await deriveKeys("pass-one", authSalt, masterSalt);
    const { authToken: b } = await deriveKeys("pass-two", authSalt, masterSalt);
    expect(bytes(a)).not.toEqual(bytes(b));
  });

  it("auth token is independent of the master salt (separate chains)", async () => {
    const authSalt = generateAuthSalt();
    const { authToken: a } = await deriveKeys("pass", authSalt, generateMasterSalt());
    const { authToken: b } = await deriveKeys("pass", authSalt, generateMasterSalt());
    // Same auth salt → same token, even though the master salt differed.
    expect(bytes(a)).toEqual(bytes(b));
  });

  it("wrap then unwrap round-trips a DEK under the held KEK", async () => {
    await deriveKeys("pass", generateAuthSalt(), generateMasterSalt());
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const { wrapped, iv } = await wrap(dek);
    expect(bytes(wrapped)).not.toEqual(bytes(dek)); // actually encrypted
    const recovered = await unwrap(wrapped, iv);
    expect(bytes(recovered)).toEqual(bytes(dek));
  });

  it("wrap fails when no passphrase has been derived", async () => {
    await expect(wrap(new Uint8Array(32))).rejects.toThrow(/master key not derived/);
  });

  it("clear drops the KEK", async () => {
    await deriveKeys("pass", generateAuthSalt(), generateMasterSalt());
    expect(hasKeys()).toBe(true);
    clear();
    expect(hasKeys()).toBe(false);
  });
});
