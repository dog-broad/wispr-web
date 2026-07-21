// Public crypto API. Spawns a single Web Worker on first use (so server
// components and SSR don't pay for it) and routes typed requests through
// it via a small id-correlated promise registry.
//
// Every browser tab gets its own worker. We do not pool or share across
// tabs — keys live in tab memory only (PROJECT.md §3) and crossing the
// tab boundary would be a leak.

import type {
  ClearKeysResult,
  DecryptResult,
  DeriveKeysResult,
  EncryptResult,
  GenerateKeyResult,
  HasKeysResult,
  UnwrapResult,
  WorkerRequest,
  WorkerResponse,
  WrapResult,
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
    throw new Error(`crypto.${expectedOp} got a response for ${response.op} (id ${response.id})`);
  }
  return response.result as T;
}

export async function generateKey(): Promise<Uint8Array> {
  const response = await send({ op: "generateKey" });
  return unwrap<GenerateKeyResult>(response, "generateKey").key;
}

export async function encrypt(key: Uint8Array, plaintext: Uint8Array): Promise<EncryptResult> {
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

/**
 * Derive the passphrase chains: the master KEK is held inside the worker; the
 * returned auth token is sent to the server (setup) or discarded (prompt).
 */
export async function deriveKeys(
  passphrase: string,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
): Promise<Uint8Array> {
  const response = await send({ op: "deriveKeys", passphrase, authSalt, masterSalt });
  return unwrap<DeriveKeysResult>(response, "deriveKeys").authToken;
}

/** Wrap a per-snippet DEK with the worker-held master KEK. */
export async function wrapDek(dek: Uint8Array): Promise<WrapResult> {
  const response = await send({ op: "wrap", dek });
  return unwrap<WrapResult>(response, "wrap");
}

/** Unwrap a DEK with the worker-held master KEK. */
export async function unwrapDek(wrapped: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const response = await send({ op: "unwrap", wrapped, iv });
  return unwrap<UnwrapResult>(response, "unwrap").dek;
}

/** Drop the master KEK from worker memory (lock / logout). */
export async function clearKeys(): Promise<void> {
  const response = await send({ op: "clearKeys" });
  unwrap<ClearKeysResult>(response, "clearKeys");
}

/** Whether this tab's worker holds a derived master KEK (unlocked). */
export async function hasKeys(): Promise<boolean> {
  const response = await send({ op: "hasKeys" });
  return unwrap<HasKeysResult>(response, "hasKeys").present;
}
