"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { WispMascot } from "@/components/pixel/WispMascot";
import { AuthError, getSession, unlock, type SessionInfo } from "@/lib/api/auth";
import { clearKeys, deriveKeys } from "@/lib/crypto/client";

export function PassphrasePrompt() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Return to where the unlock was triggered from; only same-origin relative
  // paths are honoured so the param can't be used as an open redirect.
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [salts, setSalts] = useState<{ auth: Uint8Array; master: Uint8Array } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "working">("loading");
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void getSession().then((session: SessionInfo | null) => {
      if (session === null) {
        router.replace("/login");
        return;
      }
      if (session.needsPassphraseSetup || !session.authCredentialSalt || !session.masterKeySalt) {
        router.replace("/setup-passphrase");
        return;
      }
      setSalts({ auth: session.authCredentialSalt, master: session.masterKeySalt });
      setStatus("ready");
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!salts) return;
    setError(null);
    setStatus("working");
    try {
      const authToken = await deriveKeys(passphrase, salts.auth, salts.master);
      await unlock(authToken);
      // Correct passphrase — the KEK is now held in the worker for this tab.
      router.push(next as Parameters<typeof router.push>[0]);
    } catch (err) {
      // Wrong passphrase derived a bad KEK; drop it before letting them retry.
      await clearKeys();
      setStatus("ready");
      if (err instanceof AuthError && err.status === 423) {
        setError("Too many attempts — your account is locked for an hour.");
      } else if (err instanceof AuthError && err.status === 401) {
        setError("That passphrase doesn't match. Try again.");
      } else {
        setError("Couldn't unlock. Try again.");
      }
    }
  }

  if (status === "loading") {
    return (
      <PixelCard variant="lifted" className="p-6 md:p-8">
        <div className="flex items-center gap-4">
          <WispMascot state="idle" size={2} />
          <p className="text-[16px] font-[var(--font-body)]">loading…</p>
        </div>
      </PixelCard>
    );
  }

  return (
    <PixelCard variant="lifted" accent="purple" className="p-6 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <WispMascot state="linking" size={2} />
        <div>
          <h2 className="text-[22px] leading-tight font-[var(--font-display)]">
            unlock your clips
          </h2>
          <p className="mt-1 text-[14px] font-[var(--font-body)] opacity-80">
            Enter your passphrase to decrypt this session.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-[var(--font-body)] opacity-90">passphrase</span>
          <PixelInput
            type="password"
            autoComplete="current-password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="border-[2px] border-[var(--color-pink)] bg-[color-mix(in_srgb,var(--color-pink)_15%,transparent)] px-3 py-2 text-[14px] font-[var(--font-body)]"
          >
            {error}
          </p>
        )}

        <PixelButton
          type="submit"
          variant="secondary"
          size="md"
          block
          disabled={status === "working"}
        >
          {status === "working" ? "unlocking…" : "unlock"}
        </PixelButton>
      </form>
    </PixelCard>
  );
}
