/// <reference lib="webworker" />
// Worker entry point. Receives WorkerRequest messages, dispatches to the
// pure primitive functions, posts back a WorkerResponse. Errors are
// stringified so they cross the worker boundary cleanly.

import {
  clear,
  commitNext,
  deriveAuthToken,
  deriveKeys,
  deriveNext,
  discardNext,
  hasKeys,
  rewrapToNext,
  unwrap,
  wrap,
} from "./masterkey";
import { decrypt, encrypt, generateKey } from "./primitives";
import type { WorkerRequest, WorkerResponse } from "./types";

addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    const response = await handle(req);
    postMessage(response);
  } catch (err) {
    const failure: WorkerResponse = {
      id: req.id,
      ok: false,
      op: req.op,
      error: errorMessage(err),
    };
    postMessage(failure);
  }
});

async function handle(req: WorkerRequest): Promise<WorkerResponse> {
  switch (req.op) {
    case "generateKey":
      return { id: req.id, ok: true, op: "generateKey", result: { key: generateKey() } };
    case "encrypt": {
      const out = await encrypt(req.key, req.plaintext, req.aad);
      return { id: req.id, ok: true, op: "encrypt", result: out };
    }
    case "decrypt": {
      const plaintext = await decrypt(req.key, req.ciphertext, req.iv, req.aad);
      return { id: req.id, ok: true, op: "decrypt", result: { plaintext } };
    }
    case "deriveKeys": {
      const result = await deriveKeys(req.passphrase, req.authSalt, req.masterSalt);
      return { id: req.id, ok: true, op: "deriveKeys", result };
    }
    case "wrap": {
      const result = await wrap(req.dek);
      return { id: req.id, ok: true, op: "wrap", result };
    }
    case "unwrap": {
      const dek = await unwrap(req.wrapped, req.iv);
      return { id: req.id, ok: true, op: "unwrap", result: { dek } };
    }
    case "deriveAuthToken": {
      const result = await deriveAuthToken(req.passphrase, req.authSalt);
      return { id: req.id, ok: true, op: "deriveAuthToken", result };
    }
    case "deriveNextKey": {
      const result = await deriveNext(req.passphrase, req.authSalt, req.masterSalt);
      return { id: req.id, ok: true, op: "deriveNextKey", result };
    }
    case "rewrapToNext": {
      const result = await rewrapToNext(req.wrapped, req.iv);
      return { id: req.id, ok: true, op: "rewrapToNext", result };
    }
    case "commitNextKey": {
      commitNext();
      return { id: req.id, ok: true, op: "commitNextKey", result: { committed: true } };
    }
    case "discardNextKey": {
      discardNext();
      return { id: req.id, ok: true, op: "discardNextKey", result: { discarded: true } };
    }
    case "clearKeys": {
      clear();
      return { id: req.id, ok: true, op: "clearKeys", result: { cleared: true } };
    }
    case "hasKeys":
      return { id: req.id, ok: true, op: "hasKeys", result: { present: hasKeys() } };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}
