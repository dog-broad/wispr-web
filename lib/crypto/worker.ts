/// <reference lib="webworker" />
// Worker entry point. Receives WorkerRequest messages, dispatches to the
// pure primitive functions, posts back a WorkerResponse. Errors are
// stringified so they cross the worker boundary cleanly.

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
      const out = await encrypt(req.key, req.plaintext);
      return { id: req.id, ok: true, op: "encrypt", result: out };
    }
    case "decrypt": {
      const plaintext = await decrypt(req.key, req.ciphertext, req.iv);
      return { id: req.id, ok: true, op: "decrypt", result: { plaintext } };
    }
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}
