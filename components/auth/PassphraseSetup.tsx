"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { WispMascot } from "@/components/pixel/WispMascot";
import { AuthError, setupPassphrase } from "@/lib/api/auth";
import { deriveKeys } from "@/lib/crypto/client";
import { generateAuthSalt, generateMasterSalt } from "@/lib/crypto/kdf-params";

const MIN_LENGTH = 10;

export function PassphraseSetup() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (passphrase.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (passphrase !== confirm) {
      setError("The two passphrases don't match.");
      return;
    }
    setStatus("working");
    try {
      const authSalt = generateAuthSalt();
      const masterSalt = generateMasterSalt();
      // Derives both chains; the master KEK is held in the worker for this tab.
      const authToken = await deriveKeys(passphrase, authSalt, masterSalt);
      await setupPassphrase(authToken, authSalt, masterSalt);
      router.push("/");
    } catch (err) {
      setStatus("idle");
      if (err instanceof AuthError && err.status === 409) {
        setError("A passphrase is already set for this account.");
      } else {
        setError("Couldn't set your passphrase. Try again.");
      }
    }
  }

  return (
    <PixelCard variant="lifted" accent="purple" className="p-6 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <WispMascot state="pinning" size={2} />
        <div>
          <h2 className="font-[var(--font-display)] text-[22px] leading-tight">
            set your passphrase
          </h2>
          <p className="mt-1 font-[var(--font-body)] text-[14px] opacity-80">
            It encrypts everything you save. Choose something strong.
          </p>
        </div>
      </div>

      <p className="mb-5 border-[2px] border-[var(--color-marigold)] bg-[color-mix(in_srgb,var(--color-marigold)_18%,transparent)] px-3 py-2 font-[var(--font-body)] text-[14px]">
        There is <strong>no recovery</strong>. We never see your passphrase or your
        keys. If you forget it, your saved clips are gone for good.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-[var(--font-body)] text-[14px] opacity-90">passphrase</span>
          <PixelInput
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-[var(--font-body)] text-[14px] opacity-90">confirm passphrase</span>
          <PixelInput
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="border-[2px] border-[var(--color-pink)] bg-[color-mix(in_srgb,var(--color-pink)_15%,transparent)] px-3 py-2 font-[var(--font-body)] text-[14px]"
          >
            {error}
          </p>
        )}

        <PixelButton type="submit" variant="secondary" size="md" block disabled={status === "working"}>
          {status === "working" ? "securing…" : "set passphrase"}
        </PixelButton>
      </form>
    </PixelCard>
  );
}
