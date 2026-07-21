"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DecryptingCard,
  FileOkCard,
  GoneCard,
  MalformedCard,
  NotFoundCard,
  OkCard,
  PasswordPromptCard,
  UrlOkCard,
} from "@/app/s/[id]/ReceiveCards";
import { Turnstile } from "@/components/auth/Turnstile";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import {
  resolveByPin,
  type ByPinResult,
  type PinGoneReason,
  type PinShareData,
} from "@/lib/api/pin";
import { unpackEnvelope } from "@/lib/crypto/encoding";
import { derivePasswordHash } from "@/lib/crypto/password";
import type { Language } from "@/lib/highlight/highlight";
import { detectUrl } from "@/lib/url-preview/detect";

type View =
  | { kind: "decrypting" }
  | { kind: "ok"; text: string; lang: Language | null }
  | { kind: "ok-url"; url: URL }
  | { kind: "ok-file"; blob: Blob; name: string; mime: string }
  | { kind: "password"; salt: Uint8Array; wrongAttempts: number; verifying: boolean }
  | { kind: "gone"; reason: PinGoneReason }
  | { kind: "unknown" }
  | { kind: "turnstile"; failed: boolean }
  | { kind: "error" };

const KNOWN_LANGS: readonly Language[] = [
  "javascript",
  "typescript",
  "python",
  "json",
  "bash",
  "sql",
];

interface MetadataPayload {
  lang?: Language;
  name?: string;
  mime?: string;
}

async function decryptMeta(
  cryptoMod: typeof import("@/lib/crypto/client"),
  data: PinShareData,
): Promise<MetadataPayload | null> {
  try {
    const { iv, ciphertext } = unpackEnvelope(data.encryptedMetadata);
    const bytes = await cryptoMod.decrypt(data.contentKey, ciphertext, iv);
    return JSON.parse(new TextDecoder().decode(bytes)) as MetadataPayload;
  } catch {
    return null;
  }
}

async function decryptPinShare(data: PinShareData): Promise<View> {
  try {
    const cryptoMod = await import("@/lib/crypto/client");
    const { iv, ciphertext } = unpackEnvelope(data.ciphertext);
    const plaintext = await cryptoMod.decrypt(data.contentKey, ciphertext, iv);

    if (data.contentType === "file") {
      const meta = await decryptMeta(cryptoMod, data);
      const name = typeof meta?.name === "string" ? meta.name : "download";
      const mime = typeof meta?.mime === "string" ? meta.mime : "application/octet-stream";
      return { kind: "ok-file", blob: new Blob([plaintext], { type: mime }), name, mime };
    }

    const text = new TextDecoder().decode(plaintext);
    if (data.contentType === "url") {
      const url = detectUrl(text);
      if (url !== null) return { kind: "ok-url", url };
    }
    let lang: Language | null = null;
    if (data.contentType === "code") {
      const meta = await decryptMeta(cryptoMod, data);
      if (typeof meta?.lang === "string" && (KNOWN_LANGS as readonly string[]).includes(meta.lang)) {
        lang = meta.lang;
      }
    }
    return { kind: "ok", text, lang };
  } catch {
    // A decrypt failure here means the server's content key didn't match the
    // ciphertext — a server-side fault, not a wrong client key (Mode 2 keys
    // come from the server).
    return { kind: "error" };
  }
}

export function Mode2Receive({
  pin,
  initial,
  onReset,
}: {
  pin: string;
  initial: ByPinResult;
  onReset: () => void;
}) {
  const [view, setView] = useState<View>({ kind: "decrypting" });
  const applied = useRef(false);

  const apply = useCallback(async (result: ByPinResult) => {
    if (result.kind === "pin_share") {
      setView({ kind: "decrypting" });
      setView(await decryptPinShare(result.data));
      return;
    }
    if (result.kind === "password_required") {
      setView({ kind: "password", salt: result.salt, wrongAttempts: 0, verifying: false });
      return;
    }
    if (result.kind === "password_incorrect") {
      setView((current) =>
        current.kind === "password"
          ? { ...current, wrongAttempts: current.wrongAttempts + 1, verifying: false }
          : { kind: "error" },
      );
      return;
    }
    if (result.kind === "gone") {
      setView({ kind: "gone", reason: result.reason });
      return;
    }
    if (result.kind === "unknown_pin") {
      setView({ kind: "unknown" });
      return;
    }
    if (result.kind === "turnstile_required" || result.kind === "turnstile_failed") {
      setView({ kind: "turnstile", failed: result.kind === "turnstile_failed" });
      return;
    }
    setView({ kind: "error" });
  }, []);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    void apply(initial);
  }, [apply, initial]);

  async function onPassword(password: string) {
    if (view.kind !== "password") return;
    const salt = view.salt;
    setView({ ...view, verifying: true });
    let hash: Uint8Array;
    try {
      hash = await derivePasswordHash(password, salt);
    } catch {
      setView({ kind: "error" });
      return;
    }
    await apply(await resolveByPin(pin, { passwordHash: hash }));
  }

  async function onTurnstileToken(token: string) {
    if (!token) return;
    setView({ kind: "decrypting" });
    await apply(await resolveByPin(pin, { turnstileToken: token }));
  }

  return (
    <section className="relative">
      {renderView(view, onPassword, onTurnstileToken)}
      <div className="mt-4 flex justify-center">
        <PixelButton
          variant="outline"
          size="sm"
          leading={<PixelIcon name="reload" size={14} />}
          onClick={onReset}
        >
          enter a different PIN
        </PixelButton>
      </div>
    </section>
  );
}

function renderView(
  view: View,
  onPassword: (pw: string) => void | Promise<void>,
  onToken: (token: string) => void | Promise<void>,
) {
  switch (view.kind) {
    case "decrypting":
      return <DecryptingCard />;
    case "ok":
      return <OkCard text={view.text} lang={view.lang} />;
    case "ok-url":
      return <UrlOkCard url={view.url} />;
    case "ok-file":
      return <FileOkCard blob={view.blob} name={view.name} mime={view.mime} />;
    case "password":
      return (
        <PasswordPromptCard
          wrongAttempts={view.wrongAttempts}
          rateLimited={false}
          verifying={view.verifying}
          onSubmit={onPassword}
        />
      );
    case "gone":
      return <GoneCard reason={view.reason} />;
    case "unknown":
      return <NotFoundCard />;
    case "turnstile":
      return (
        <PixelCard variant="lifted" accent="marigold" className="p-6 md:p-8">
          <h2 className="font-[var(--font-display)] text-[22px] leading-tight">
            quick check
          </h2>
          <p className="mt-3 font-[var(--font-body)] text-[16px] opacity-90">
            {view.failed
              ? "Couldn't verify you're human — try again."
              : "Too many attempts from here. Confirm you're human to continue."}
          </p>
          <Turnstile onToken={onToken} />
        </PixelCard>
      );
    case "error":
      return <MalformedCard />;
  }
}
