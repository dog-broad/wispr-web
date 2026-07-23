"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { AuthError, getSession, type SessionInfo } from "@/lib/api/auth";
import { createInvite, listSessions, revokeSession, type DeviceSession } from "@/lib/api/account";
import { changeMyPassphrase } from "@/lib/account/change-passphrase";
import { PixelInput } from "@/components/pixel/PixelInput";

type Gate = "loading" | "redirecting" | "ready";

export function Settings() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("loading");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [devices, setDevices] = useState<DeviceSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setDevices(await listSessions());
    } catch {
      setError("Couldn't load your devices.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const current = await getSession();
      if (cancelled) return;
      if (current === null) {
        setGate("redirecting");
        router.replace("/login");
        return;
      }
      setSession(current);
      setGate("ready");
      await loadDevices();
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loadDevices]);

  const revoke = useCallback(
    async (id: string) => {
      setDevices((prev) => prev?.filter((d) => d.id !== id) ?? null);
      try {
        await revokeSession(id);
      } catch {
        setError("Couldn't sign out that device.");
        await loadDevices();
      }
    },
    [loadDevices],
  );

  if (gate !== "ready") {
    return (
      <PixelCard variant="lifted" className="p-6 md:p-8">
        <div className="flex items-center gap-4">
          <WispMascot state="idle" size={2} />
          <p className="text-[16px] font-[var(--font-body)]">
            {gate === "redirecting" ? "one moment…" : "loading…"}
          </p>
        </div>
      </PixelCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error !== null && (
        <p
          role="alert"
          className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]"
        >
          {error}
        </p>
      )}

      <SettingsSection title="Account">
        <p className="text-[14px] font-[var(--font-body)]">
          Signed in as <span className="font-semibold">{session?.email}</span>
        </p>
      </SettingsSection>

      <SettingsSection title="Devices">
        {devices === null ? (
          <p className="text-[14px] font-[var(--font-body)] opacity-70">loading devices…</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 border-[2px] border-[var(--border)] bg-[var(--bg-sunk)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-[var(--font-body)]">
                    {device.deviceLabel}
                  </p>
                  <p className="num text-[12px] font-[var(--font-mono)] opacity-70">
                    last seen {formatWhen(device.lastSeenAt)}
                  </p>
                </div>
                {device.current ? (
                  <PixelBadge tone="success">this device</PixelBadge>
                ) : (
                  <PixelButton
                    variant="ghost"
                    size="sm"
                    leading={<PixelIcon name="close" size={12} />}
                    onClick={() => void revoke(device.id)}
                  >
                    sign out
                  </PixelButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      {session !== null && !session.needsPassphraseSetup && <ChangePassphraseSection />}

      {session?.isAdmin && <InviteSection />}
    </div>
  );
}

type ChangeState =
  | { kind: "idle" }
  | { kind: "working"; rewrapped: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

function ChangePassphraseSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<ChangeState>({ kind: "idle" });

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length > 0 && next === confirm && state.kind !== "working";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "working", rewrapped: 0 });
    try {
      await changeMyPassphrase(current, next, (rewrapped) =>
        setState({ kind: "working", rewrapped }),
      );
      setState({ kind: "done" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setState({ kind: "error", message: changeErrorMessage(err) });
    }
  }

  return (
    <SettingsSection title="Passphrase">
      {state.kind === "done" ? (
        <p className="border-[2px] border-[var(--color-moss)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]">
          Passphrase changed. Your clips were re-encrypted; other devices need the new passphrase.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-[14px] font-[var(--font-body)] opacity-80">
            Re-encrypts every saved clip in your browser. There&apos;s no recovery — a forgotten
            passphrase means lost clips.
          </p>
          <PixelInput
            type="password"
            autoComplete="current-password"
            placeholder="current passphrase"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <PixelInput
            type="password"
            autoComplete="new-password"
            placeholder="new passphrase"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PixelInput
            type="password"
            autoComplete="new-password"
            placeholder="confirm new passphrase"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && (
            <p className="text-[12px] font-[var(--font-body)] text-[var(--color-pink)]">
              Passphrases don&apos;t match.
            </p>
          )}
          {state.kind === "error" && (
            <p
              role="alert"
              className="text-[14px] font-[var(--font-body)] text-[var(--color-pink)]"
            >
              {state.message}
            </p>
          )}
          <PixelButton type="submit" variant="secondary" size="md" disabled={!canSubmit}>
            {state.kind === "working" ? `re-encrypting… (${state.rewrapped})` : "Change passphrase"}
          </PixelButton>
        </form>
      )}
    </SettingsSection>
  );
}

function changeErrorMessage(err: unknown): string {
  if (err instanceof AuthError) {
    if (err.status === 401) return "That current passphrase doesn't match.";
    if (err.status === 423) return "Too many attempts — locked for an hour.";
    if (err.status === 409) return "A clip changed mid-update — try again.";
  }
  return "Couldn't change your passphrase. Try again.";
}

function InviteSection() {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true);
    try {
      setCode(await createInvite());
    } catch {
      setCode(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection title="Invites">
      <div className="flex flex-col gap-3">
        <p className="text-[14px] font-[var(--font-body)] opacity-80">
          Signup is invite-only. Mint a single-use code to share.
        </p>
        {code !== null && (
          <p className="border-[2px] border-[var(--color-purple)] bg-[var(--bg-sunk)] px-3 py-2 text-[16px] font-[var(--font-mono)]">
            <span className="num tracking-widest">{code}</span>
          </p>
        )}
        <PixelButton
          variant="secondary"
          size="md"
          leading={<PixelIcon name="plus" size={16} />}
          onClick={() => void issue()}
          disabled={busy}
        >
          {busy ? "minting…" : "New invite code"}
        </PixelButton>
      </div>
    </SettingsSection>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PixelCard variant="lifted">
      <h2 className="mb-3 text-[22px] leading-tight font-[var(--font-display)]">{title}</h2>
      {children}
    </PixelCard>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
