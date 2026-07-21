// Wire format between the client wrapper and the worker. Both sides
// import these types; the worker file itself is bundled separately by
// Next.js / Webpack via `new Worker(new URL("./worker.ts", import.meta.url))`.

export type WorkerRequest =
  | { id: number; op: "generateKey" }
  | { id: number; op: "encrypt"; key: Uint8Array; plaintext: Uint8Array; aad?: Uint8Array }
  | {
      id: number;
      op: "decrypt";
      key: Uint8Array;
      ciphertext: Uint8Array;
      iv: Uint8Array;
      aad?: Uint8Array;
    }
  | {
      id: number;
      op: "deriveKeys";
      passphrase: string;
      authSalt: Uint8Array;
      masterSalt: Uint8Array;
    }
  | { id: number; op: "wrap"; dek: Uint8Array }
  | { id: number; op: "unwrap"; wrapped: Uint8Array; iv: Uint8Array }
  | { id: number; op: "clearKeys" }
  | { id: number; op: "hasKeys" };

export type GenerateKeyResult = { key: Uint8Array };
export type EncryptResult = { ciphertext: Uint8Array; iv: Uint8Array };
export type DecryptResult = { plaintext: Uint8Array };
// Only the auth token leaves the worker; the master KEK stays inside it.
export type DeriveKeysResult = { authToken: Uint8Array };
export type WrapResult = { wrapped: Uint8Array; iv: Uint8Array };
export type UnwrapResult = { dek: Uint8Array };
export type ClearKeysResult = { cleared: true };
// Whether this tab's worker currently holds a derived master KEK. Lets the
// main thread tell "unlocked" from "locked" without touching the key itself.
export type HasKeysResult = { present: boolean };

export type WorkerSuccess =
  | { id: number; ok: true; op: "generateKey"; result: GenerateKeyResult }
  | { id: number; ok: true; op: "encrypt"; result: EncryptResult }
  | { id: number; ok: true; op: "decrypt"; result: DecryptResult }
  | { id: number; ok: true; op: "deriveKeys"; result: DeriveKeysResult }
  | { id: number; ok: true; op: "wrap"; result: WrapResult }
  | { id: number; ok: true; op: "unwrap"; result: UnwrapResult }
  | { id: number; ok: true; op: "clearKeys"; result: ClearKeysResult }
  | { id: number; ok: true; op: "hasKeys"; result: HasKeysResult };

export type WorkerFailure = {
  id: number;
  ok: false;
  op: WorkerRequest["op"];
  error: string;
};

export type WorkerResponse = WorkerSuccess | WorkerFailure;
