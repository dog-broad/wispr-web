"use client";

import { useEffect, useState } from "react";
import { PixelBadge } from "./PixelBadge";
import { CheckIcon } from "./icons";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; ms: number; keyBytes: number; ciphertextBytes: number }
  | { kind: "fail"; reason: string };

// Runs an encrypt → decrypt round-trip in the worker on mount. A green
// badge means the worker file is bundled, the WebCrypto wiring is sound,
// and the AES-GCM round-trip succeeds end-to-end. Red surfaces the first
// failing step so the operator knows where the wire broke.
const PLAINTEXT = new TextEncoder().encode("wispr crypto self-test 🌸");

export function CryptoSelfTest() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "checking" });
    const started = performance.now();

    (async () => {
      try {
        // Lazy-import the client so this component is safe to bundle into
        // pages that may pre-render server-side; the Worker constructor
        // does not exist during SSR.
        const crypto = await import("@/lib/crypto/client");
        const key = await crypto.generateKey();
        const { ciphertext, iv } = await crypto.encrypt(key, PLAINTEXT);
        const plaintext = await crypto.decrypt(key, ciphertext, iv);
        if (cancelled) return;
        const roundTripped = new TextDecoder().decode(plaintext);
        if (roundTripped !== "wispr crypto self-test 🌸") {
          setStatus({ kind: "fail", reason: "plaintext mismatch after decrypt" });
          return;
        }
        setStatus({
          kind: "ok",
          ms: Math.round(performance.now() - started),
          keyBytes: key.byteLength,
          ciphertextBytes: ciphertext.byteLength,
        });
      } catch (err) {
        if (cancelled) return;
        const reason = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "fail", reason });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="inline-flex flex-wrap items-center gap-2 font-[var(--font-body)] text-[14px]">
      <span className="opacity-70">crypto</span>
      <span className="num opacity-90">aes-gcm-256 round-trip</span>
      <Pill status={status} />
    </span>
  );
}

function Pill({ status }: { status: Status }) {
  switch (status.kind) {
    case "idle":
    case "checking":
      return <PixelBadge tone="neutral">checking…</PixelBadge>;
    case "ok":
      return (
        <PixelBadge tone="success">
          <CheckIcon size={12} />
          <span>ok</span>
          <span className="num opacity-70">{status.ms}ms</span>
          <span className="num opacity-70">
            key={status.keyBytes}B ct={status.ciphertextBytes}B
          </span>
        </PixelBadge>
      );
    case "fail":
      return <PixelBadge tone="error">fail — {status.reason}</PixelBadge>;
  }
}
