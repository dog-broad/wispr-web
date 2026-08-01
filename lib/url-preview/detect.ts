// "Single URL" detector for the URL content type. The composer marks
// content_type=url only when the trimmed message is exactly one https?
// URL; text that *contains* a URL stays as plain text (or code) and
// gets inline linkification on receive instead.
//
// The narrow shape ("pure URL share") is the share-time signal the
// receive page uses to swap in the rich preview card; mixed prose
// shouldn't fight that surface for screen real estate.

const URL_RE = /^https?:\/\/\S+$/;

/** Returns the parsed URL when ``text`` is a single https? URL with
 *  no surrounding text, or ``null`` otherwise. Trailing punctuation
 *  is treated as part of the URL (the spec doesn't tolerate trailing
 *  whitespace, which is the more common copy-paste mistake). */
export function detectUrl(text: string): URL | null {
  const trimmed = text.trim();
  if (!URL_RE.test(trimmed)) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}
