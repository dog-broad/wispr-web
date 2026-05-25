// Connect-state banner shared by /pair (sender) and /r (receiver).
//
// The SAS code is the optional MITM check from [D-0024-01]: both peers
// derive the same 4-char Crockford-base32 value if and only if no
// operator man-in-the-middle was inserted into signaling. Verifying it
// out-of-band (read it over voice, glance across the desk) is the
// user-facing recourse. The UX rule is "send first, verify if you
// care" — the code is shown but doesn't gate the channel.

import type { ReactNode } from "react";

export type ConnectBannerState =
  | { kind: "idle" }
  | { kind: "connected"; sas: string }
  | { kind: "failed"; reason: string };

export function ConnectBanner({ state }: { state: ConnectBannerState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "connected") {
    return (
      <Banner color="moss" dot title={<span>Connected</span>}>
        <span className="opacity-70">— code</span>{" "}
        <span
          className="num font-[var(--font-mono)] text-[20px] tracking-widest"
          aria-label={`Security code ${state.sas.split("").join(" ")}`}
        >
          {state.sas}
        </span>
        <span className="ml-auto hidden text-[12px] opacity-70 sm:inline">
          read it on the other device to confirm
        </span>
      </Banner>
    );
  }
  return (
    <Banner color="pink" dot title={<span className="font-semibold">Pair failed</span>}>
      <span className="num ml-auto opacity-80">{state.reason}</span>
    </Banner>
  );
}

function Banner({
  color,
  dot,
  title,
  children,
}: {
  color: "moss" | "pink";
  dot: boolean;
  title: ReactNode;
  children: ReactNode;
}) {
  const borderClass =
    color === "moss"
      ? "border-[var(--color-moss)]"
      : "border-[var(--color-pink)]";
  const dotClass =
    color === "moss" ? "bg-[var(--color-moss)]" : "bg-[var(--color-pink)]";
  return (
    <div
      className={`flex w-full items-center gap-3 border-[2px] ${borderClass} bg-[var(--bg-sunk)] px-3 py-2 font-[var(--font-body)] text-[14px]`}
    >
      {dot && (
        <span aria-hidden className={`inline-block h-3 w-3 ${dotClass}`} />
      )}
      {title}
      {children}
    </div>
  );
}
