"use client";

import { useCallback, useEffect, useState } from "react";
import { base64Decode, base64Encode, base64urlDecode, unpackEnvelope } from "@/lib/crypto/encoding";
import { derivePasswordHash } from "@/lib/crypto/password";
import { downloadChunks } from "@/lib/files/download";
import { env } from "@/lib/env";
import type { Language } from "@/lib/highlight/highlight";
import { detectUrl } from "@/lib/url-preview/detect";
import {
  DecryptingCard,
  FileOkCard,
  GoneCard,
  MalformedCard,
  MissingKeyCard,
  NetworkErrorCard,
  NotFoundCard,
  OkCard,
  PasswordPromptCard,
  UrlOkCard,
  WrongKeyCard,
} from "./ReceiveCards";

type ReceiveState =
  | { kind: "checking" }
  | { kind: "missing-key" }
  | { kind: "fetching" }
  | { kind: "decrypting" }
  | {
      kind: "password-required";
      salt: Uint8Array;
      wrongAttempts: number;
      rateLimited: boolean;
      verifying: boolean;
    }
  | { kind: "ok"; text: string; lang: Language | null }
  | { kind: "ok-url"; url: URL }
  | { kind: "ok-file"; blob: Blob; name: string; mime: string }
  | { kind: "gone"; reason: "expired" | "burned" | "taken_down" }
  | { kind: "not-found" }
  | { kind: "wrong-key" }
  | { kind: "network-error"; reason: string }
  | { kind: "malformed" };

interface PasswordRequiredBody {
  status: "password_required";
  password_salt: string;
}

type FetchBody = {
  id: string;
  share_mode: string;
  content_type: string;
  ciphertext: string;
  encrypted_metadata: string;
  // File-backed snippets carry the content as R2 chunk objects instead of
  // inline ciphertext; download_urls is one presigned GET per chunk.
  chunk_count?: number | null;
  download_urls?: string[] | null;
};

// Same shape as the sender's MetadataPayload. The receiver reads the
// lang hint (drives syntax highlighting) and the file fields (drive
// the download card).
interface MetadataPayload {
  v?: number;
  lang?: Language;
  name?: string;
  mime?: string;
}

const KNOWN_LANGS: readonly Language[] = [
  "javascript",
  "typescript",
  "python",
  "json",
  "bash",
  "sql",
];

type GoneBody = {
  status: "gone";
  reason: "expired" | "burned" | "taken_down";
};

const KEY_FRAGMENT_RE = /^#k=([A-Za-z0-9_-]+)$/;
const KEY_BYTES = 32;

export function Receive({ snippetId }: { snippetId: string }) {
  const [state, setState] = useState<ReceiveState>({ kind: "checking" });
  const [key, setKey] = useState<Uint8Array | null>(null);

  const decryptBody = useCallback(
    async (body: FetchBody, decryptionKey: Uint8Array): Promise<ReceiveState> => {
      try {
        const crypto = await import("@/lib/crypto/client");
        const plaintextBytes =
          body.download_urls && body.download_urls.length > 0
            ? await downloadChunks(decryptionKey, body.download_urls)
            : await (async () => {
                const { iv, ciphertext } = unpackEnvelope(base64Decode(body.ciphertext));
                return crypto.decrypt(decryptionKey, ciphertext, iv);
              })();

        if (body.content_type === "file") {
          const meta = await decryptMetadata(crypto, decryptionKey, body.encrypted_metadata);
          const name = typeof meta?.name === "string" ? meta.name : "download";
          const mime = typeof meta?.mime === "string" ? meta.mime : "application/octet-stream";
          const blob = new Blob([plaintextBytes], { type: mime });
          return { kind: "ok-file", blob, name, mime };
        }

        const text = new TextDecoder().decode(plaintextBytes);

        if (body.content_type === "url") {
          const url = detectUrl(text);
          if (url !== null) return { kind: "ok-url", url };
        }

        let lang: Language | null = null;
        if (body.content_type === "code") {
          const meta = await decryptMetadata(crypto, decryptionKey, body.encrypted_metadata);
          if (
            typeof meta?.lang === "string" &&
            (KNOWN_LANGS as readonly string[]).includes(meta.lang)
          ) {
            lang = meta.lang;
          }
        }

        return { kind: "ok", text, lang };
      } catch {
        return { kind: "wrong-key" };
      }
    },
    [],
  );

  const submitPassword = useCallback(
    async (password: string) => {
      if (state.kind !== "password-required" || key === null) return;
      setState({ ...state, verifying: true });
      let hash: Uint8Array;
      try {
        hash = await derivePasswordHash(password, state.salt);
      } catch {
        setState({ ...state, verifying: false });
        return;
      }
      let response: Response;
      try {
        response = await fetch(`${env.apiBaseUrl}/snippets/${snippetId}/verify-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password_hash: base64Encode(hash) }),
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : "unknown error";
        setState({ kind: "network-error", reason });
        return;
      }

      if (response.status === 401) {
        setState({
          ...state,
          verifying: false,
          wrongAttempts: state.wrongAttempts + 1,
        });
        return;
      }
      if (response.status === 429) {
        setState({ ...state, verifying: false, rateLimited: true });
        return;
      }
      if (response.status === 410) {
        const body = (await safeJson<GoneBody>(response)) ?? null;
        const reason = body?.reason;
        if (reason === "expired" || reason === "burned" || reason === "taken_down") {
          setState({ kind: "gone", reason });
        } else {
          setState({ kind: "malformed" });
        }
        return;
      }
      if (!response.ok) {
        setState({ kind: "malformed" });
        return;
      }

      const body = await safeJson<FetchBody>(response);
      if (!body || typeof body.ciphertext !== "string") {
        setState({ kind: "malformed" });
        return;
      }
      setState({ kind: "decrypting" });
      setState(await decryptBody(body, key));
    },
    [decryptBody, key, snippetId, state],
  );

  const run = useCallback(async () => {
    const keyB64Url = readKeyFromFragment();
    if (!keyB64Url) {
      setState({ kind: "missing-key" });
      return;
    }
    let decryptionKey: Uint8Array;
    try {
      decryptionKey = base64urlDecode(keyB64Url);
    } catch {
      setState({ kind: "missing-key" });
      return;
    }
    if (decryptionKey.byteLength !== KEY_BYTES) {
      setState({ kind: "missing-key" });
      return;
    }
    setKey(decryptionKey);

    setState({ kind: "fetching" });
    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}/snippets/${snippetId}`, {
        cache: "no-store",
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      setState({ kind: "network-error", reason });
      return;
    }

    if (response.status === 404) {
      setState({ kind: "not-found" });
      return;
    }
    if (response.status === 410) {
      const body = (await safeJson<GoneBody>(response)) ?? null;
      const reason = body?.reason;
      if (reason === "expired" || reason === "burned" || reason === "taken_down") {
        setState({ kind: "gone", reason });
      } else {
        setState({ kind: "malformed" });
      }
      return;
    }
    if (response.status === 401) {
      const body = await safeJson<PasswordRequiredBody>(response);
      if (!body || body.status !== "password_required") {
        setState({ kind: "malformed" });
        return;
      }
      let salt: Uint8Array;
      try {
        salt = base64Decode(body.password_salt);
      } catch {
        setState({ kind: "malformed" });
        return;
      }
      setState({
        kind: "password-required",
        salt,
        wrongAttempts: 0,
        rateLimited: false,
        verifying: false,
      });
      return;
    }
    if (!response.ok) {
      setState({ kind: "malformed" });
      return;
    }

    const body = await safeJson<FetchBody>(response);
    if (!body || typeof body.ciphertext !== "string") {
      setState({ kind: "malformed" });
      return;
    }

    setState({ kind: "decrypting" });
    setState(await decryptBody(body, decryptionKey));
  }, [decryptBody, snippetId]);

  useEffect(() => {
    void run();
  }, [run]);

  switch (state.kind) {
    case "checking":
    case "fetching":
    case "decrypting":
      return <DecryptingCard />;
    case "missing-key":
      return <MissingKeyCard />;
    case "wrong-key":
      return <WrongKeyCard />;
    case "password-required":
      return (
        <PasswordPromptCard
          wrongAttempts={state.wrongAttempts}
          rateLimited={state.rateLimited}
          verifying={state.verifying}
          onSubmit={submitPassword}
        />
      );
    case "ok":
      return <OkCard text={state.text} lang={state.lang} />;
    case "ok-url":
      return <UrlOkCard url={state.url} />;
    case "ok-file":
      return <FileOkCard blob={state.blob} name={state.name} mime={state.mime} />;
    case "gone":
      return <GoneCard reason={state.reason} />;
    case "not-found":
      return <NotFoundCard />;
    case "network-error":
      return <NetworkErrorCard reason={state.reason} onRetry={run} />;
    case "malformed":
      return <MalformedCard />;
  }
}

function readKeyFromFragment(): string | null {
  if (typeof window === "undefined") return null;
  const match = KEY_FRAGMENT_RE.exec(window.location.hash);
  return match ? (match[1] ?? null) : null;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// Decrypt + parse the encrypted_metadata envelope. Returns ``null`` on
// any failure (missing field, decrypt error, JSON parse error). The
// caller falls back to defaults rather than failing the whole receive.
async function decryptMetadata(
  cryptoMod: typeof import("@/lib/crypto/client"),
  key: Uint8Array,
  encoded: string | undefined,
): Promise<MetadataPayload | null> {
  if (typeof encoded !== "string") return null;
  try {
    const envelope = base64Decode(encoded);
    const { iv, ciphertext } = unpackEnvelope(envelope);
    const bytes = await cryptoMod.decrypt(key, ciphertext, iv);
    return JSON.parse(new TextDecoder().decode(bytes)) as MetadataPayload;
  } catch {
    return null;
  }
}
