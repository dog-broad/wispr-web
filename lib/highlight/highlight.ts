// Tiny three-color syntax tokenizer covering the five languages that
// show up most often in shared snippets (JS/TS, Python, JSON, Bash,
// SQL). The output palette is fixed by the project's aesthetic rules:
// purple for keywords, marigold for strings, moss for comments,
// everything else plain.
//
// The implementation prioritises predictable behaviour over depth.
// It is *not* a parser — it's a lex-only scan that recognises three
// token classes by regex. That is enough to make code look like code
// at small reading sizes, which is the entire goal here. Languages
// with grammars that don't fit the keyword-string-comment model
// (HTML, CSS, etc.) are intentionally out of scope.

export type Language = "javascript" | "typescript" | "python" | "json" | "bash" | "sql";

export type TokenKind = "keyword" | "string" | "comment" | "plain";

export interface Token {
  kind: TokenKind;
  text: string;
}

interface LanguageGrammar {
  keywords: ReadonlySet<string>;
  /** Case-sensitive by default; SQL is the one exception. */
  caseInsensitiveKeywords?: boolean;
  /** Patterns tried in order; first match wins. Each must use the
   *  ``y`` (sticky) flag so we can drive them from a single cursor. */
  stringPatterns: readonly RegExp[];
  commentPatterns: readonly RegExp[];
  /** Characters that begin an identifier — used to gate keyword
   *  matching so ``case`` doesn't light up inside ``staircase``. */
  identifierStart?: RegExp;
  identifierContinue?: RegExp;
}

const IDENT_START = /[A-Za-z_$]/y;
const IDENT_CONTINUE = /[A-Za-z0-9_$]/y;
// Python doesn't allow ``$`` in identifiers; the difference doesn't
// actually matter for tokenizing because we only care about word
// boundaries, but kept distinct for clarity.
const PY_IDENT_START = /[A-Za-z_]/y;
const PY_IDENT_CONTINUE = /[A-Za-z0-9_]/y;

const JS_KEYWORDS: ReadonlySet<string> = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

const TS_EXTRA_KEYWORDS: ReadonlySet<string> = new Set([
  "abstract",
  "any",
  "as",
  "boolean",
  "declare",
  "enum",
  "implements",
  "interface",
  "is",
  "namespace",
  "never",
  "number",
  "private",
  "protected",
  "public",
  "readonly",
  "satisfies",
  "string",
  "symbol",
  "type",
  "unknown",
]);

const TS_KEYWORDS: ReadonlySet<string> = new Set([
  ...JS_KEYWORDS,
  ...TS_EXTRA_KEYWORDS,
]);

const PY_KEYWORDS: ReadonlySet<string> = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const JSON_KEYWORDS: ReadonlySet<string> = new Set(["true", "false", "null"]);

const BASH_KEYWORDS: ReadonlySet<string> = new Set([
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "export",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "local",
  "return",
  "select",
  "then",
  "until",
  "while",
]);

const SQL_KEYWORDS: ReadonlySet<string> = new Set([
  "alter",
  "and",
  "as",
  "asc",
  "by",
  "case",
  "create",
  "delete",
  "desc",
  "distinct",
  "drop",
  "else",
  "end",
  "exists",
  "foreign",
  "from",
  "group",
  "having",
  "in",
  "index",
  "inner",
  "insert",
  "into",
  "is",
  "join",
  "key",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "offset",
  "on",
  "or",
  "order",
  "outer",
  "primary",
  "references",
  "right",
  "select",
  "set",
  "table",
  "then",
  "union",
  "update",
  "values",
  "view",
  "when",
  "where",
  "with",
]);

const GRAMMARS: Record<Language, LanguageGrammar> = {
  javascript: {
    keywords: JS_KEYWORDS,
    stringPatterns: [
      /"(?:[^"\\\n]|\\.)*"/y,
      /'(?:[^'\\\n]|\\.)*'/y,
      /`(?:[^`\\]|\\.)*`/y,
    ],
    commentPatterns: [/\/\/[^\n]*/y, /\/\*[\s\S]*?\*\//y],
    identifierStart: IDENT_START,
    identifierContinue: IDENT_CONTINUE,
  },
  typescript: {
    keywords: TS_KEYWORDS,
    stringPatterns: [
      /"(?:[^"\\\n]|\\.)*"/y,
      /'(?:[^'\\\n]|\\.)*'/y,
      /`(?:[^`\\]|\\.)*`/y,
    ],
    commentPatterns: [/\/\/[^\n]*/y, /\/\*[\s\S]*?\*\//y],
    identifierStart: IDENT_START,
    identifierContinue: IDENT_CONTINUE,
  },
  python: {
    keywords: PY_KEYWORDS,
    stringPatterns: [
      /"""[\s\S]*?"""/y,
      /'''[\s\S]*?'''/y,
      /"(?:[^"\\\n]|\\.)*"/y,
      /'(?:[^'\\\n]|\\.)*'/y,
    ],
    commentPatterns: [/#[^\n]*/y],
    identifierStart: PY_IDENT_START,
    identifierContinue: PY_IDENT_CONTINUE,
  },
  json: {
    keywords: JSON_KEYWORDS,
    stringPatterns: [/"(?:[^"\\\n]|\\.)*"/y],
    commentPatterns: [],
    identifierStart: PY_IDENT_START,
    identifierContinue: PY_IDENT_CONTINUE,
  },
  bash: {
    keywords: BASH_KEYWORDS,
    stringPatterns: [
      /"(?:[^"\\\n]|\\.)*"/y,
      /'[^'\n]*'/y,
    ],
    commentPatterns: [/#[^\n]*/y],
    identifierStart: PY_IDENT_START,
    identifierContinue: PY_IDENT_CONTINUE,
  },
  sql: {
    keywords: SQL_KEYWORDS,
    caseInsensitiveKeywords: true,
    stringPatterns: [/'(?:[^'\\\n]|\\.)*'/y],
    commentPatterns: [/--[^\n]*/y, /\/\*[\s\S]*?\*\//y],
    identifierStart: PY_IDENT_START,
    identifierContinue: PY_IDENT_CONTINUE,
  },
};

/** Break ``text`` into a stream of tokens for ``language``. Output
 *  concatenated produces the original input exactly — the tokenizer
 *  never elides content, only labels it. */
export function tokenize(language: Language, text: string): Token[] {
  const grammar = GRAMMARS[language];
  const tokens: Token[] = [];
  let plainStart = 0;
  let cursor = 0;

  const flushPlain = (until: number) => {
    if (plainStart < until) {
      tokens.push({ kind: "plain", text: text.slice(plainStart, until) });
    }
  };

  while (cursor < text.length) {
    let matched = false;

    for (const pattern of grammar.commentPatterns) {
      pattern.lastIndex = cursor;
      const m = pattern.exec(text);
      if (m && m.index === cursor) {
        flushPlain(cursor);
        tokens.push({ kind: "comment", text: m[0] });
        cursor += m[0].length;
        plainStart = cursor;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    for (const pattern of grammar.stringPatterns) {
      pattern.lastIndex = cursor;
      const m = pattern.exec(text);
      if (m && m.index === cursor) {
        flushPlain(cursor);
        tokens.push({ kind: "string", text: m[0] });
        cursor += m[0].length;
        plainStart = cursor;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const startPattern = grammar.identifierStart ?? IDENT_START;
    const continuePattern = grammar.identifierContinue ?? IDENT_CONTINUE;
    startPattern.lastIndex = cursor;
    if (startPattern.test(text)) {
      let end = cursor + 1;
      while (end < text.length) {
        continuePattern.lastIndex = end;
        if (!continuePattern.test(text)) break;
        end += 1;
      }
      const word = text.slice(cursor, end);
      const lookup = grammar.caseInsensitiveKeywords ? word.toLowerCase() : word;
      if (grammar.keywords.has(lookup)) {
        flushPlain(cursor);
        tokens.push({ kind: "keyword", text: word });
        plainStart = end;
      }
      cursor = end;
      continue;
    }

    cursor += 1;
  }

  flushPlain(text.length);
  return tokens;
}

/** Convenience for tests: stringify a token stream back to the raw
 *  text it represents. The tokenizer's invariant is
 *  ``raw === tokens.map(t => t.text).join("")``. */
export function joinTokens(tokens: readonly Token[]): string {
  return tokens.map((t) => t.text).join("");
}
