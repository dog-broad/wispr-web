// Lightweight language detector. The heuristic is intentionally
// conservative — it returns ``null`` when no signal is strong enough,
// which the composer treats as "ship as plain text, no syntax
// highlight." False negatives cost a missing highlight; false
// positives ship the wrong colors and feel worse.
//
// Strategy:
//   1. Probe for distinctive shebangs / language markers on the first
//      non-empty line.
//   2. Try parsing as JSON — if it succeeds for an object/array root,
//      tag it as JSON.
//   3. Score each remaining language by how many of its discriminating
//      patterns appear; pick the top scorer if it clears a small
//      threshold and beats the runner-up.

import type { Language } from "./highlight";

const SHEBANG = /^#!\s*(?:\/\S+\/)?(?:env\s+)?(\w+)/;

interface LanguageProbe {
  /** Patterns that strongly suggest this language. Each match counts
   *  once regardless of how many times it occurs — we're scoring
   *  presence, not density. */
  patterns: RegExp[];
}

const PROBES: Record<Exclude<Language, "json">, LanguageProbe> = {
  typescript: {
    patterns: [
      /\binterface\s+[A-Z]/,
      /\btype\s+[A-Z]\w*\s*=/,
      /\b(?:const|let|var)\s+\w+\s*:\s*\w/,
      /:\s*(?:string|number|boolean|void|any|unknown|never)\b/,
      /\bas\s+(?:const|\w+)/,
    ],
  },
  javascript: {
    patterns: [
      /\bfunction\s+\w+\s*\(/,
      /=>\s*[{(]/,
      /\bconst\s+\w+\s*=/,
      /\b(?:let|var)\s+\w+\s*=/,
      /\bconsole\.(?:log|error|warn|info)\(/,
      /\brequire\(['"]/,
      /\bmodule\.exports\b/,
    ],
  },
  python: {
    patterns: [
      /^\s*def\s+\w+\s*\(/m,
      /^\s*class\s+\w+\s*[:(]/m,
      /^\s*from\s+\w[\w.]*\s+import\b/m,
      /^\s*import\s+\w[\w.,\s]*$/m,
      /\bprint\s*\(/,
      /\bself\b/,
      /^\s*if\s+__name__\s*==\s*['"]__main__['"]/m,
    ],
  },
  bash: {
    patterns: [
      /^\s*#!.*\b(?:bash|sh|zsh)\b/,
      /\$\{?\w+\}?/,
      /^\s*(?:if|for|while)\s+.*\bthen\b/m,
      /^\s*(?:if|for|while|case)\b/m,
      /\becho\s+/,
      /\b(?:fi|done|esac)\b/,
    ],
  },
  sql: {
    patterns: [
      /\bSELECT\s+[\w*]/i,
      /\bFROM\s+\w/i,
      /\bWHERE\s+\w/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+\w+\s+SET\b/i,
      /\bCREATE\s+(?:TABLE|INDEX|VIEW)\b/i,
      /\bJOIN\s+\w/i,
    ],
  },
};

const SHEBANG_LANGS: Record<string, Language> = {
  bash: "bash",
  sh: "bash",
  zsh: "bash",
  python: "python",
  python3: "python",
  node: "javascript",
  deno: "typescript",
};

/** Detect the most likely language for ``text``, or ``null`` when
 *  no language probes clearly. */
export function detectLanguage(text: string): Language | null {
  // Too short to detect reliably — anything under ~12 chars is more
  // likely a paste fragment than meaningful code.
  if (text.length < 12) return null;

  // 1) shebang short-circuit
  const shebangMatch = SHEBANG.exec(text.trimStart());
  if (shebangMatch) {
    const interpreter = shebangMatch[1]?.toLowerCase();
    if (interpreter && SHEBANG_LANGS[interpreter]) {
      return SHEBANG_LANGS[interpreter] ?? null;
    }
  }

  // 2) JSON probe — only count if the root parses as an object/array
  // and the input starts with a brace/bracket (so a stray ``true`` in
  // prose doesn't tag it as JSON).
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        return "json";
      }
    } catch {
      /* not json */
    }
  }

  // 3) Per-language scoring. We want a clear winner — a single match
  // can fire incidentally in prose, so require ≥ 2 distinct probe
  // hits AND a margin of at least 1 over the runner-up before we
  // commit to a language.
  const scores: Array<{ lang: Language; score: number }> = [];
  for (const [lang, probe] of Object.entries(PROBES) as [Language, LanguageProbe][]) {
    let score = 0;
    for (const pattern of probe.patterns) {
      if (pattern.test(text)) score += 1;
    }
    scores.push({ lang, score });
  }
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];
  if (!top || top.score < 2) return null;
  if (second && top.score - second.score < 1) return null;
  return top.lang;
}
