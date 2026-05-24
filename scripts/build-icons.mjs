// Build the pixel-icons sprite served at /pixel-icons.svg.
//
// Reads every .svg from node_modules/pixelarticons/svg/, extracts each
// icon's inner path content, wraps it in <symbol id="px-<name>"> with a
// shared viewBox, and writes one combined sprite to public/pixel-icons.svg.
//
// At runtime the <PixelIcon> wrapper instantiates icons via:
//
//   <svg fill="currentColor"><use href="/pixel-icons.svg#px-<name>" /></svg>
//
// The sprite is served same-origin so the cross-document <use> reference
// works in every modern browser. Pixelarticons SVGs already declare
// fill="currentColor" on their paths, so the consumer's `color` value
// cascades through the <use>'s shadow tree.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = dirname(dirname(__filename));

const srcDir = join(root, "node_modules", "pixelarticons", "svg");
const outFile = join(root, "public", "pixel-icons.svg");

// pixelarticons is consistent: every icon is `<svg ... viewBox="0 0 24 24">
//   <path d="..." fill="currentColor"/>
// </svg>`. We extract everything between the outer <svg ...> and </svg>
// (i.e., the inner <path>) and rewrap it into a <symbol>.
const innerRe = /<svg[^>]*>([\s\S]*?)<\/svg>/;

function readIcon(file) {
  const content = readFileSync(join(srcDir, file), "utf8");
  const m = innerRe.exec(content);
  if (!m) {
    throw new Error(`couldn't parse icon ${file}`);
  }
  return m[1].trim();
}

const names = readdirSync(srcDir)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => ({ file: f, name: basename(f, ".svg") }))
  .sort((a, b) => a.name.localeCompare(b.name));

const symbols = names
  .map(({ file, name }) => {
    const inner = readIcon(file);
    return `  <symbol id="px-${name}" viewBox="0 0 24 24">${inner}</symbol>`;
  })
  .join("\n");

const sprite = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${symbols}
</svg>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, sprite, "utf8");

const size = Buffer.byteLength(sprite, "utf8");
console.log(`built ${outFile} (${names.length} icons, ${(size / 1024).toFixed(1)} KB)`);
