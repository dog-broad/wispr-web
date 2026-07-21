// A one-shot text handoff into the live Pair sender. Resharing a Sync clip to
// Pair can't produce a static artifact (Pair is a live P2P channel), so the
// clip's plaintext is stashed here and the Pair composer pre-fills from it.

export const PAIR_DRAFT_KEY = "wispr-pair-draft";

export function stashPairDraft(text: string): void {
  try {
    window.sessionStorage.setItem(PAIR_DRAFT_KEY, text);
  } catch {
    // Storage disabled (private mode): reshare-to-pair just starts empty.
  }
}

/** Read and clear the stashed pair draft, or null if none. */
export function takePairDraft(): string | null {
  try {
    const value = window.sessionStorage.getItem(PAIR_DRAFT_KEY);
    if (value !== null) window.sessionStorage.removeItem(PAIR_DRAFT_KEY);
    return value;
  } catch {
    return null;
  }
}
