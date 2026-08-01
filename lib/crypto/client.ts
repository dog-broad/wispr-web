// Public crypto API. Spawns a single Web Worker on first use (so server
// components and SSR don't pay for it) and routes typed requests through
// it via a small id-correlated promise registry.
//
// Every browser tab gets its own worker. We do not pool or share across
// tabs — keys live in tab memory only and crossing the tab boundary would
// be a leak.

import type {
  ClearKeysResult,
  CommitNextKeyResult,
  DecryptResult,
  DeriveAuthTokenResult,
  DeriveKeysResult,
  DeriveNextKeyResult,
  DiscardNextKeyResult,
  EncryptResult,
  GenerateKeyResult,
  HasKeysResult,
  RewrapResult,
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

// Distributive Omit keeps the discriminated union intact: `Omit` on a
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

export async function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array,
): Promise<EncryptResult> {
  const response = await send(
    aad === undefined ? { op: "encrypt", key, plaintext } : { op: "encrypt", key, plaintext, aad },
  );
  return unwrap<EncryptResult>(response, "encrypt");
}

export async function decrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  aad?: Uint8Array,
): Promise<Uint8Array> {
  const response = await send(
    aad === undefined
      ? { op: "decrypt", key, ciphertext, iv }
      : { op: "decrypt", key, ciphertext, iv, aad },
  );
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

/** Derive only the auth token from a passphrase: no KEK side effects. For
 *  re-auth (proving the current passphrase) without disturbing the held KEK. */
export async function deriveAuthToken(
  passphrase: string,
  authSalt: Uint8Array,
): Promise<Uint8Array> {
  const response = await send({ op: "deriveAuthToken", passphrase, authSalt });
  return unwrap<DeriveAuthTokenResult>(response, "deriveAuthToken").authToken;
}

/** Derive a pending "next" KEK from a new passphrase (for a passphrase change).
 *  The current KEK stays active until commitNextKey. Returns the new auth token. */
export async function deriveNextKey(
  passphrase: string,
  authSalt: Uint8Array,
  masterSalt: Uint8Array,
): Promise<Uint8Array> {
  const response = await send({ op: "deriveNextKey", passphrase, authSalt, masterSalt });
  return unwrap<DeriveNextKeyResult>(response, "deriveNextKey").authToken;
}

/** Re-wrap one DEK from the current KEK to the pending next KEK. */
export async function rewrapToNext(wrapped: Uint8Array, iv: Uint8Array): Promise<RewrapResult> {
  const response = await send({ op: "rewrapToNext", wrapped, iv });
  return unwrap<RewrapResult>(response, "rewrapToNext");
}

/** Promote the next KEK to current — call once the server accepts the change. */
export async function commitNextKey(): Promise<void> {
  const response = await send({ op: "commitNextKey" });
  unwrap<CommitNextKeyResult>(response, "commitNextKey");
}

/** Drop the pending next KEK — call if the change fails. */
export async function discardNextKey(): Promise<void> {
  const response = await send({ op: "discardNextKey" });
  unwrap<DiscardNextKeyResult>(response, "discardNextKey");
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
