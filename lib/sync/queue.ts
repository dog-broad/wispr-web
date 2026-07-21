// Offline queue for Sync clips, backed by IndexedDB.
//
// A clip is only ever queued *after* it's sealed, so what lands here is
// already ciphertext + a DEK wrapped by the master KEK — nothing plaintext,
// no key material. That's why the flush path needs no unlock: it
// just re-POSTs the stored envelope. The queue persists across reloads and
// browser restarts, so an offline save survives until it reaches the server.

import type { ClipContentType } from "@/lib/api/sync";
import type { SealedClip } from "@/lib/sync/clip";

const DB_NAME = "wispr-offline";
const DB_VERSION = 1;
const STORE = "sync-queue";

export interface QueuedClip extends SealedClip {
  id: number;
  contentType: ClipContentType;
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB request failed"));
  });
}

/** Append a sealed clip to the queue; returns its generated key. */
export async function enqueue(contentType: ClipContentType, sealed: SealedClip): Promise<number> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    // The key is auto-assigned, so `id` is a placeholder the store overwrites.
    const record = { contentType, queuedAt: Date.now(), ...sealed };
    const key = await promisify(tx.objectStore(STORE).add(record));
    return key as number;
  } finally {
    db.close();
  }
}

/** All queued clips, oldest first (insertion order). */
export async function allQueued(): Promise<QueuedClip[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    return await promisify(tx.objectStore(STORE).getAll() as IDBRequest<QueuedClip[]>);
  } finally {
    db.close();
  }
}

export async function removeQueued(id: number): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await promisify(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function queueCount(): Promise<number> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    return await promisify(tx.objectStore(STORE).count());
  } finally {
    db.close();
  }
}
