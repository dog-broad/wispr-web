"use client";

import { useCallback, useEffect, useState } from "react";
import {
  base64Decode,
  base64urlDecode,
  unpackEnvelope,
} from "@/lib/crypto/encoding";
import { env } from "@/lib/env";
import type { Language } from "@/lib/highlight/highlight";
import { detectUrl } from "@/lib/url-preview/detect";
import {
  DecryptingCard,
  GoneCard,
  MalformedCard,
  MissingKeyCard,
  NetworkErrorCard,
  NotFoundCard,
  OkCard,
  UrlOkCard,
  WrongKeyCard,
} from "./ReceiveCards";

type ReceiveState =
  | { kind: "checking" }
  | { kind: "missing-key" }
  | { kind: "fetching" }
  | { kind: "decrypting" }
  | { kind: "ok"; text: string; lang: Language | null }
  | { kind: "ok-url"; url: URL }
  | { kind: "gone"; reason: "expired" | "burned" | "taken_down" }
  | { kind: "not-found" }
  | { kind: "wrong-key" }
  | { kind: "network-error"; reason: string }
  | { kind: "malformed" };

type FetchBody = {
  id: string;
  share_mode: string;
  content_type: string;
  ciphertext: string;
  encrypted_metadata: string;
};

// Same shape as the sender's MetadataPayload. The receiver only reads
// the lang hint here; future fields (filename for inline file
// snippets, etc.) follow the same versioned envelope.
interface MetadataPayload {
  v?: number;
  lang?: Language;
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

  const run = useCallback(async () => {
    const keyB64Url = readKeyFromFragment();
    if (!keyB64Url) {
      setState({ kind: "missing-key" });
      return;
    }
    let key: Uint8Array;
    try {
      key = base64urlDecode(keyB64Url);
    } catch {
      setState({ kind: "missing-key" });
      return;
    }
    if (key.byteLength !== KEY_BYTES) {
      setState({ kind: "missing-key" });
      return;
    }

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
    try {
      const crypto = await import("@/lib/crypto/client");
      const envelope = base64Decode(body.ciphertext);
      const { iv, ciphertext } = unpackEnvelope(envelope);
      const plaintextBytes = await crypto.decrypt(key, ciphertext, iv);
      const text = new TextDecoder().decode(plaintextBytes);

      // URL share: skip the metadata decrypt; the URL is the content.
      // Validate the decoded text actually parses as a URL — the
      // server-side content_type is opaque to us and could lie. (Not
      // a security boundary; the worst case is rendering a plain
      // string in the URL card.)
      if (body.content_type === "url") {
        const url = detectUrl(text);
        if (url !== null) {
          setState({ kind: "ok-url", url });
          return;
        }
      }

      // Decrypt the metadata too so we can pick up the lang hint. A
      // failure here drops back to plain rendering — the content is
      // recoverable even without the metadata, so a partial decrypt
      // shouldn't surface as a hard error.
      let lang: Language | null = null;
      if (body.content_type === "code" && typeof body.encrypted_metadata === "string") {
        try {
          const metaEnvelope = base64Decode(body.encrypted_metadata);
          const metaUnpacked = unpackEnvelope(metaEnvelope);
          const metaBytes = await crypto.decrypt(
            key,
            metaUnpacked.ciphertext,
            metaUnpacked.iv,
          );
          const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as MetadataPayload;
          if (
            typeof meta.lang === "string" &&
            (KNOWN_LANGS as readonly string[]).includes(meta.lang)
          ) {
            lang = meta.lang;
          }
        } catch {
          /* metadata decrypt or parse failed — render unhighlighted */
        }
      }

      setState({ kind: "ok", text, lang });
    } catch {
      // Any failure on the decrypt path — bad key, tampered ciphertext,
      // malformed envelope — surfaces as wrong-key to the user. The
      // distinction between "key was wrong" and "ciphertext was corrupted"
      // is not actionable from their side; both mean "the sender's URL
      // is no longer good".
      setState({ kind: "wrong-key" });
    }
  }, [snippetId]);

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
    case "ok":
      return <OkCard text={state.text} lang={state.lang} />;
    case "ok-url":
      return <UrlOkCard url={state.url} />;
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
