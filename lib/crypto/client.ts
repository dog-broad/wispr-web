// Public crypto API. Spawns a single Web Worker on first use (so server
// components and SSR don't pay for it) and routes typed requests through
// it via a small id-correlated promise registry.
//
// Every browser tab gets its own worker. We do not pool or share across
// tabs — keys live in tab memory only (PROJECT.md §3) and crossing the
// tab boundary would be a leak.

import type {
  DecryptResult,
  EncryptResult,
  GenerateKeyResult,
  WorkerRequest,
  WorkerResponse,
} from "./types";

type PendingResolve = (value: WorkerResponse) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, PendingResolve>();

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    throw new Error("crypto client requires a browser environment (no Worker available)");
  }
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const resolve = pending.get(response.id);
    if (!resolve) return;
    pending.delete(response.id);
    resolve(response);
  });
  return worker;
}

// Distributive Omit keeps the discriminated union intact — `Omit` on a
// raw union collapses to the common properties, which loses op narrowing.
type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

function send(req: WithoutId<WorkerRequest>): Promise<WorkerResponse> {
  const id = nextId++;
  return new Promise<WorkerResponse>((resolve) => {
    pending.set(id, resolve);
    getWorker().postMessage({ ...req, id });
  });
}

function unwrap<T>(response: WorkerResponse, expectedOp: WorkerRequest["op"]): T {
  if (!response.ok) {
    throw new Error(`crypto.${expectedOp} failed: ${response.error}`);
  }
  if (response.op !== expectedOp) {
    throw new Error(
      `crypto.${expectedOp} got a response for ${response.op} (id ${response.id})`,
    );
  }
  return response.result as T;
}

export async function generateKey(): Promise<Uint8Array> {
  const response = await send({ op: "generateKey" });
  return unwrap<GenerateKeyResult>(response, "generateKey").key;
}

export async function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
): Promise<EncryptResult> {
  const response = await send({ op: "encrypt", key, plaintext });
  return unwrap<EncryptResult>(response, "encrypt");
}

export async function decrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  const response = await send({ op: "decrypt", key, ciphertext, iv });
  return unwrap<DecryptResult>(response, "decrypt").plaintext;
}
