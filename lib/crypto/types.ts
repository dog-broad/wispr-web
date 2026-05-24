// Wire format between the client wrapper and the worker. Both sides
// import these types; the worker file itself is bundled separately by
// Next.js / Webpack via `new Worker(new URL("./worker.ts", import.meta.url))`.

export type WorkerRequest =
  | { id: number; op: "generateKey" }
  | { id: number; op: "encrypt"; key: Uint8Array; plaintext: Uint8Array }
  | {
      id: number;
      op: "decrypt";
      key: Uint8Array;
      ciphertext: Uint8Array;
      iv: Uint8Array;
    };

export type GenerateKeyResult = { key: Uint8Array };
export type EncryptResult = { ciphertext: Uint8Array; iv: Uint8Array };
export type DecryptResult = { plaintext: Uint8Array };

export type WorkerSuccess =
  | { id: number; ok: true; op: "generateKey"; result: GenerateKeyResult }
  | { id: number; ok: true; op: "encrypt"; result: EncryptResult }
  | { id: number; ok: true; op: "decrypt"; result: DecryptResult };

export type WorkerFailure = {
  id: number;
  ok: false;
  op: WorkerRequest["op"];
  error: string;
};

export type WorkerResponse = WorkerSuccess | WorkerFailure;
