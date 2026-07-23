// Orchestrates a passphrase change end-to-end, client-side.
//
// Order matters for safety: prove the current passphrase (re-auth) *before*
// deriving any new key or touching the held KEK, so a wrong guess can't clobber
// an unlocked session. Then re-wrap every Sync DEK from the current KEK to the
// new one and submit the whole thing in a single atomic request. The new KEK is
// only promoted to "current" once the server accepts — on any failure the
// pending key is discarded and the session keeps working with the old key.

import { changePassphrase, getSession, unlock, type RewrappedDek } from "@/lib/api/auth";
import { listSyncSnippets } from "@/lib/api/sync";
import {
  commitNextKey,
  deriveAuthToken,
  deriveKeys,
  deriveNextKey,
  discardNextKey,
  hasKeys,
  rewrapToNext,
} from "@/lib/crypto/client";

const SALT_BYTES = 16;

export class NoPassphraseError extends Error {}

/**
 * Change the passphrase. `onProgress` reports the running count of re-wrapped
 * clips. Throws {@link import("@/lib/api/auth").AuthError} 401 (wrong current),
 * 423 (locked), or 409 (a clip was saved mid-change — retry).
 */
export async function changeMyPassphrase(
  currentPassphrase: string,
  newPassphrase: string,
  onProgress?: (rewrapped: number) => void,
): Promise<void> {
  const session = await getSession();
  if (session === null || session.authCredentialSalt === null || session.masterKeySalt === null) {
    throw new NoPassphraseError("no active passphrase to change");
  }

  // Re-auth first — no key side effects on a wrong guess.
  const currentAuthToken = await deriveAuthToken(currentPassphrase, session.authCredentialSalt);
  await unlock(currentAuthToken);

  // Current passphrase is proven correct; make sure the current KEK is held so
  // we can unwrap DEKs (a locked tab derives it now, correctly).
  if (!(await hasKeys())) {
    await deriveKeys(currentPassphrase, session.authCredentialSalt, session.masterKeySalt);
  }

  const newAuthSalt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const newMasterSalt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const newAuthToken = await deriveNextKey(newPassphrase, newAuthSalt, newMasterSalt);

  try {
    const rewrapped: RewrappedDek[] = [];
    let before: string | undefined;
    for (;;) {
      const page = await listSyncSnippets(before);
      for (const item of page.items) {
        const r = await rewrapToNext(item.wrappedDek, item.wrappedDekIv);
        rewrapped.push({ id: item.id, wrappedDek: r.wrapped, wrappedDekIv: r.iv });
      }
      onProgress?.(rewrapped.length);
      if (page.nextBefore === null) break;
      before = page.nextBefore;
    }

    await changePassphrase({
      currentAuthToken,
      newAuthToken,
      newAuthSalt,
      newMasterSalt,
      rewrapped,
    });
    // Server accepted — the new KEK is now the session's key.
    await commitNextKey();
  } catch (err) {
    await discardNextKey();
    throw err;
  }
}
