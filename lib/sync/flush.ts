// Drain the offline Sync queue: re-POST each sealed clip, dropping it from the
// queue on success. Because queued clips are already encrypted, this needs no
// passphrase — just an authenticated session. Stops on the first failure (most
// likely connectivity dropped again, or the session expired) and leaves the
// rest queued for the next attempt, preserving order.

import { createSyncSnippet } from "@/lib/api/sync";
import { allQueued, removeQueued } from "@/lib/sync/queue";

export const QUEUE_FLUSHED_EVENT = "wispr:queue-flushed";

export async function flushQueue(): Promise<number> {
  const items = await allQueued();
  let flushed = 0;
  for (const item of items) {
    try {
      await createSyncSnippet(item.contentType, {
        ciphertext: item.ciphertext,
        encryptedMetadata: item.encryptedMetadata,
        wrappedDek: item.wrappedDek,
        wrappedDekIv: item.wrappedDekIv,
      });
    } catch {
      break;
    }
    await removeQueued(item.id);
    flushed += 1;
  }
  return flushed;
}
