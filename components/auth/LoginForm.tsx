"use client";

import { useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { WispMascot } from "@/components/pixel/WispMascot";
import { AuthError, requestMagicLink } from "@/lib/api/auth";
import { Turnstile } from "./Turnstile";

export function LoginForm({ initialInvite }: { initialInvite?: string | undefined }) {
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(initialInvite ?? "");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      await requestMagicLink({
        email: email.trim(),
        inviteCode: invite.trim() || undefined,
        turnstileToken,
      });
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      if (err instanceof AuthError && err.status === 429) {
        setError("Too many requests. Give it a few minutes and try again.");
      } else if (err instanceof AuthError && err.status === 400) {
        setError("Couldn't verify you're human. Try again.");
      } else {
        setError("Something went wrong sending your link. Try again.");
      }
    }
  }

  if (status === "sent") {
    return (
      <PixelCard variant="lifted" accent="moss" className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <WispMascot state="success" size={2} />
          <div>
            <h2 className="font-[var(--font-display)] text-[22px] leading-tight">
              check your email
            </h2>
            <p className="mt-3 font-[var(--font-body)] text-[16px] opacity-90">
              If <span className="num break-all">{email.trim()}</span> has an account
              (or a valid invite), a sign-in link is on its way. It works once and
              expires in <span className="num">15</span> minutes.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="pixel-press mt-5 inline-flex h-10 items-center border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-3 font-[var(--font-body)] text-[14px] shadow-[3px_3px_0_0_var(--border)]"
            >
              use a different email
            </button>
          </div>
        </div>
      </PixelCard>
    );
  }

  return (
    <PixelCard variant="lifted" accent="pink" className="p-6 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <WispMascot state="linking" size={2} />
        <div>
          <h2 className="font-[var(--font-display)] text-[22px] leading-tight">
            sign in
          </h2>
          <p className="mt-1 font-[var(--font-body)] text-[14px] opacity-80">
            We&apos;ll email you a link. No password.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-[var(--font-body)] text-[14px] opacity-90">email</span>
          <PixelInput
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-[var(--font-body)] text-[14px] opacity-90">
            invite code <span className="opacity-60">(only if you&apos;re new)</span>
          </span>
          <PixelInput
            type="text"
            autoComplete="off"
            placeholder="8-character code"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
          />
        </label>

        <Turnstile onToken={setTurnstileToken} />

        {error && (
          <p
            role="alert"
            className="border-[2px] border-[var(--color-pink)] bg-[color-mix(in_srgb,var(--color-pink)_15%,transparent)] px-3 py-2 font-[var(--font-body)] text-[14px]"
          >
            {error}
          </p>
        )}

        <PixelButton type="submit" variant="primary" size="md" block disabled={status === "sending"}>
          {status === "sending" ? "sending…" : "send my link"}
        </PixelButton>
      </form>
    </PixelCard>
  );
}
