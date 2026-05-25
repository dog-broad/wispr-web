import { describe, expect, it } from "vitest";

import { detectLanguage } from "./detect";
import { joinTokens, tokenize, type Language } from "./highlight";

describe("highlight/tokenize", () => {
  it("output concatenated reproduces the input exactly (every language)", () => {
    const samples: Array<[Language, string]> = [
      ["javascript", "const x = 'hi'; // hi\nconsole.log(x);"],
      ["typescript", "interface A { x: string }\nconst a: A = { x: 'y' };"],
      ["python", "def f(x):\n    # hi\n    return 'a'"],
      ["json", '{"a": "b", "c": true}'],
      ["bash", "#!/bin/bash\nif [ -z $x ]; then\n  echo 'hi'\nfi"],
      ["sql", "SELECT * FROM t WHERE x = 'y' -- comment"],
    ];
    for (const [lang, src] of samples) {
      expect(joinTokens(tokenize(lang, src)), `lang=${lang}`).toBe(src);
    }
  });

  it("labels JS keywords, strings, and comments distinctly", () => {
    const tokens = tokenize("javascript", "const greeting = 'hi'; // wave");
    const kinds = tokens.filter((t) => t.kind !== "plain").map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toContain("keyword:const");
    expect(kinds).toContain("string:'hi'");
    expect(kinds).toContain("comment:// wave");
  });

  it("does not flag keywords inside identifiers", () => {
    // ``case`` is a JS keyword; ``staircase`` is an identifier that
    // contains the same letters. The tokenizer must not tag it.
    const tokens = tokenize("javascript", "const staircase = 1;");
    const keywords = tokens.filter((t) => t.kind === "keyword").map((t) => t.text);
    expect(keywords).toEqual(["const"]);
  });

  it("treats Python triple-quoted strings as a single string token", () => {
    const tokens = tokenize("python", 'x = """multi\nline"""');
    expect(tokens.find((t) => t.kind === "string")?.text).toBe('"""multi\nline"""');
  });

  it("matches SQL keywords case-insensitively", () => {
    const tokens = tokenize("sql", "select * from t");
    const keywords = tokens.filter((t) => t.kind === "keyword").map((t) => t.text);
    // Preserved case in the original text but recognised regardless.
    expect(keywords).toEqual(["select", "from"]);
  });

  it("never emits zero-length tokens", () => {
    const tokens = tokenize("typescript", "function f() { return 1; }");
    for (const t of tokens) {
      expect(t.text.length).toBeGreaterThan(0);
    }
  });
});

describe("highlight/detectLanguage", () => {
  it("returns null for tiny inputs", () => {
    expect(detectLanguage("hi")).toBeNull();
  });

  it("returns null for plain prose", () => {
    expect(
      detectLanguage(
        "The quick brown fox jumps over the lazy dog and then sat down for a rest.",
      ),
    ).toBeNull();
  });

  it("detects javascript from common idioms", () => {
    expect(
      detectLanguage(
        "function greet(name) {\n  console.log('hello, ' + name);\n}\nconst x = 1;",
      ),
    ).toBe("javascript");
  });

  it("detects typescript over javascript when types appear", () => {
    expect(
      detectLanguage(
        "interface Greeting {\n  name: string;\n}\nconst g: Greeting = { name: 'a' };",
      ),
    ).toBe("typescript");
  });

  it("detects python via def / import / print", () => {
    expect(
      detectLanguage(
        "import os\n\ndef greet(name):\n    print(f'hello, {name}')\n",
      ),
    ).toBe("python");
  });

  it("detects bash via shebang", () => {
    expect(
      detectLanguage("#!/usr/bin/env bash\nfor f in *; do\n  echo $f\ndone\n"),
    ).toBe("bash");
  });

  it("detects sql via SELECT/FROM/WHERE", () => {
    expect(
      detectLanguage("SELECT id, name FROM users WHERE active = TRUE ORDER BY id"),
    ).toBe("sql");
  });

  it("detects json from object root + valid parse", () => {
    expect(detectLanguage('{"a": 1, "b": [true, null, "x"]}')).toBe("json");
  });

  it("doesn't claim json for a bare 'true'", () => {
    // The JSON branch only fires on an object/array root, so a stray
    // ``true`` in prose can't tip the heuristic into a false positive.
    expect(detectLanguage("we are true to our word here, always")).toBeNull();
  });
});
