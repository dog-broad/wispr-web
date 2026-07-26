"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { WispMascot } from "@/components/pixel/WispMascot";
import { verifyMagicLink, type VerifyResult } from "@/lib/api/auth";

type State = { kind: "verifying" } | { kind: "ok"; result: VerifyResult } | { kind: "error" };

export function VerifyConsumer() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "verifying" });
  // A magic link is single-use; guard against the effect firing twice (React
  // strict mode double-invoke) so we don't spend the token on a phantom call.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setState({ kind: "error" });
      return;
    }
    void verifyMagicLink(token)
      .then((result) => setState({ kind: "ok", result }))
      .catch(() => setState({ kind: "error" }));
  }, [token]);

  if (state.kind === "verifying") {
    return (
      <PixelCard variant="lifted" className="p-6 md:p-8">
        <div className="flex items-center gap-4">
          <WispMascot state="linking" size={2} />
          <p className="text-[16px] font-[var(--font-body)]">signing you in…</p>
        </div>
      </PixelCard>
    );
  }

  if (state.kind === "error") {
    return (
      <PixelCard variant="lifted" accent="pink" className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <WispMascot state="error" size={2} />
          <div>
            <h2 className="text-[22px] leading-tight font-[var(--font-display)]">
              this link is done
            </h2>
            <p className="mt-3 text-[16px] font-[var(--font-body)] opacity-90">
              Magic links work once and expire after <span className="num">15</span> minutes. Ask
              for a fresh one.
            </p>
            <Link href="/login" className="mt-5 inline-block">
              <PixelButton variant="primary" size="md">
                get a new link
              </PixelButton>
            </Link>
          </div>
        </div>
      </PixelCard>
    );
  }

  if (state.result.emailChanged) {
    return (
      <PixelCard variant="lifted" accent="moss" className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <WispMascot state="success" size={2} />
          <div>
            <h2 className="text-[22px] leading-tight font-[var(--font-display)]">email changed</h2>
            <p className="mt-3 text-[16px] font-[var(--font-body)] opacity-90">
              Your Wispr email is now <span className="num break-all">{state.result.email}</span>.
              Use it next time you sign in.
            </p>
            <Link href="/me" className="mt-5 inline-block">
              <PixelButton variant="primary" size="md">
                my clips
              </PixelButton>
            </Link>
          </div>
        </div>
      </PixelCard>
    );
  }

  return (
    <PixelCard variant="lifted" accent="moss" className="p-6 md:p-8">
      <div className="flex items-start gap-4">
        <WispMascot state="success" size={2} />
        <div>
          <h2 className="text-[22px] leading-tight font-[var(--font-display)]">
            {state.result.needsPassphraseSetup ? "you're in — one more step" : "welcome back"}
          </h2>
          <p className="mt-3 text-[16px] font-[var(--font-body)] opacity-90">
            Signed in as <span className="num break-all">{state.result.email}</span>.
            {state.result.needsPassphraseSetup
              ? " Next, set the passphrase that protects your clips."
              : ""}
          </p>
          <Link
            href={state.result.needsPassphraseSetup ? "/setup-passphrase" : "/unlock"}
            className="mt-5 inline-block"
          >
            <PixelButton variant="primary" size="md">
              {state.result.needsPassphraseSetup ? "set passphrase" : "unlock"}
            </PixelButton>
          </Link>
        </div>
      </div>
    </PixelCard>
  );
}
