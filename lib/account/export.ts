// Builds a standalone, offline HTML decryptor around an export bundle.
//
// The bundle JSON (from GET /me/export) is embedded verbatim into a single
// self-contained .html file: no network, no fonts, no scripts loaded, just
// inline vanilla WebCrypto that re-derives the master key from the passphrase
// and decrypts every clip in the browser. This is the escape hatch: it must
// keep working years from now with the service gone, so it depends on nothing
// but the platform's `crypto.subtle`.
//
// The crypto here MUST mirror the app exactly, or old exports silently fail to
// decrypt:
//   - master KEK  = PBKDF2-SHA-256(passphrase, utf8("wispr-master-v1")||salt,
//                   600000 iters) -> AES-GCM-256
//   - Sync item   = wrapped_dek is AES-GCM(KEK) of the raw DEK, with its own
//                   separate 12-byte iv (NOT an iv||ct envelope)
//   - PIN item    = content_key IS the raw DEK (Mode 2 is server-key, so the
//                   server already unwrapped it into the bundle)
//   - content and metadata blobs are iv(12)||ciphertext+tag envelopes under
//     the DEK
// File-backed clips carry metadata only (stored:true, ciphertext null); their
// bytes live in object storage and aren't embedded.

/**
 * Assemble the decryptor document. `bundleJson` is the raw response body of
 * GET /me/export, embedded as-is. `</` is neutralised so a string inside the
 * JSON can't close the inline script tag.
 */
export function buildDecryptorHtml(bundleJson: string): string {
  const safeJson = bundleJson.replace(/</g, "\\u003c");
  return DECRYPTOR_HTML.replace("__BUNDLE__", safeJson);
}

const DECRYPTOR_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wispr export</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    background: #f4ecd8; color: #1f1a2e;
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 16px; line-height: 1.4;
    image-rendering: pixelated;
  }
  main { max-width: 880px; margin: 0 auto; }
  h1 { font-size: 32px; margin: 0 0 4px; letter-spacing: 1px; }
  .sub { color: #2d2640; margin: 0 0 24px; font-size: 14px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  input[type=password] {
    flex: 1; min-width: 200px; height: 48px; padding: 0 12px;
    border: 4px solid #1f1a2e; background: #e6dcc2; color: #1f1a2e;
    font: inherit; border-radius: 0;
  }
  button {
    height: 48px; padding: 0 20px; border: 4px solid #1f1a2e;
    background: #ff6188; color: #1f1a2e; font: inherit; font-weight: 700;
    cursor: pointer; border-radius: 0; box-shadow: 4px 4px 0 0 #1f1a2e;
  }
  button:active { transform: translate(4px, 4px); box-shadow: 0 0 0 0 #1f1a2e; }
  .note { font-size: 14px; color: #2d2640; }
  .err { color: #ff6188; font-weight: 700; }
  .clip {
    border: 2px solid #1f1a2e; background: #faf5e6;
    padding: 12px; margin-bottom: 12px; box-shadow: 4px 4px 0 0 #1f1a2e;
  }
  .clip .meta { font-size: 12px; color: #2d2640; margin-bottom: 8px; }
  .badge {
    display: inline-block; border: 2px solid #1f1a2e; padding: 0 6px;
    margin-right: 6px; font-size: 12px; background: #e6dcc2;
  }
  .badge.pin { background: #8b5fbf; color: #f4ecd8; }
  .badge.sync { background: #7a9e7e; color: #1f1a2e; }
  .badge.stored { background: #f9b572; }
  pre {
    margin: 0; padding: 8px; background: #e6dcc2; border: 2px solid #1f1a2e;
    white-space: pre-wrap; word-break: break-word; max-height: 320px; overflow: auto;
    font: inherit; font-size: 14px;
  }
  a.dl { color: #8b5fbf; font-weight: 700; }
</style>
</head>
<body>
<main>
  <h1>Wispr export</h1>
  <p class="sub" id="summary"></p>
  <div class="row">
    <input type="password" id="pass" placeholder="Passphrase" autocomplete="off" />
    <button id="go">Decrypt</button>
  </div>
  <p class="note" id="status"></p>
  <div id="out"></div>
</main>
<script>
const BUNDLE = __BUNDLE__;

function b64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function labeledSalt(label, salt) {
  const lb = new TextEncoder().encode(label);
  const out = new Uint8Array(lb.length + salt.length);
  out.set(lb, 0); out.set(salt, lb.length);
  return out;
}
async function deriveKek(passphrase, saltB64) {
  const material = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: labeledSalt("wispr-master-v1", b64(saltB64)), iterations: 600000 },
    material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function importDek(raw) {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
}
async function decryptRaw(key, iv, ct) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
}
// content/metadata blobs are iv(12) || ciphertext+tag
async function openEnvelope(key, blobB64) {
  const blob = b64(blobB64);
  return decryptRaw(key, blob.slice(0, 12), blob.slice(12));
}
function parseMeta(bytes) {
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return {}; }
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const syncCount = BUNDLE.sync.length, pinCount = BUNDLE.pins.length;
document.getElementById("summary").textContent =
  "Exported " + BUNDLE.exported_at + ", " + syncCount + " synced, " + pinCount + " PIN-share" +
  (BUNDLE.master_key_salt ? "" : " (no passphrase set on this account)");

async function decryptItem(item, kind, kek) {
  let dek;
  if (kind === "sync") {
    if (!kek) throw new Error("passphrase required");
    const raw = await decryptRaw(kek, b64(item.wrapped_dek_iv), b64(item.wrapped_dek));
    dek = await importDek(raw);
  } else {
    dek = await importDek(b64(item.content_key));
  }
  const meta = parseMeta(await openEnvelope(dek, item.encrypted_metadata));
  let body;
  if (item.stored) {
    body = { stored: true };
  } else {
    const bytes = await openEnvelope(dek, item.ciphertext);
    body = { bytes };
  }
  return { meta, body };
}

function renderClip(item, kind, res) {
  const div = document.createElement("div");
  div.className = "clip";
  const ct = item.content_type;
  const name = res.meta && res.meta.name ? " · " + esc(res.meta.name) : "";
  div.innerHTML =
    '<div class="meta"><span class="badge ' + kind + '">' + kind + '</span>' +
    '<span class="badge">' + esc(ct) + '</span>' +
    (item.stored ? '<span class="badge stored">stored</span>' : '') +
    esc(item.created_at) + name + '</div>';
  const pre = document.createElement("pre");
  if (res.body.stored) {
    pre.textContent = "[file content is stored remotely and not included in this export; " +
      "re-download it from Wispr while the service is running]";
  } else if (ct === "text" || ct === "code" || ct === "url") {
    pre.textContent = new TextDecoder().decode(res.body.bytes);
  } else {
    const blob = new Blob([res.body.bytes], { type: (res.meta && res.meta.mime) || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.className = "dl"; a.href = url; a.download = (res.meta && res.meta.name) || item.id;
    a.textContent = "Download " + ((res.meta && res.meta.name) || "file");
    pre.appendChild(a);
  }
  div.appendChild(pre);
  return div;
}

async function run() {
  const status = document.getElementById("status");
  const out = document.getElementById("out");
  out.textContent = "";
  status.className = "note"; status.textContent = "Decrypting…";
  let kek = null;
  try {
    if (BUNDLE.master_key_salt && syncCount > 0) {
      const pass = document.getElementById("pass").value;
      if (!pass) { status.className = "err"; status.textContent = "Enter your passphrase."; return; }
      kek = await deriveKek(pass, BUNDLE.master_key_salt);
    }
    let ok = 0, fail = 0;
    const items = BUNDLE.sync.map(function (i) { return { item: i, kind: "sync" }; })
      .concat(BUNDLE.pins.map(function (i) { return { item: i, kind: "pin" }; }));
    for (const { item, kind } of items) {
      try {
        const res = await decryptItem(item, kind, kek);
        out.appendChild(renderClip(item, kind, res));
        ok++;
      } catch (e) {
        fail++;
        const div = document.createElement("div");
        div.className = "clip";
        div.innerHTML = '<div class="meta err">Failed to decrypt ' + esc(item.id) +
          ' (wrong passphrase?)</div>';
        out.appendChild(div);
      }
    }
    status.className = fail ? "err" : "note";
    status.textContent = ok + " decrypted" + (fail ? ", " + fail + " failed" : "");
  } catch (e) {
    status.className = "err";
    status.textContent = "Could not derive key: " + (e && e.message ? e.message : String(e));
  }
}

document.getElementById("go").addEventListener("click", run);
document.getElementById("pass").addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
if (!BUNDLE.master_key_salt || syncCount === 0) run();
</script>
</body>
</html>`;
