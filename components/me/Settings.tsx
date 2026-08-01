"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { AuthError, getSession, type SessionInfo } from "@/lib/api/auth";
import {
  AccountError,
  changeEmail,
  createInvite,
  deleteAccount,
  fetchExportBundle,
  listSessions,
  revokeSession,
  type DeviceSession,
} from "@/lib/api/account";
import { changeMyPassphrase } from "@/lib/account/change-passphrase";
import { buildDecryptorHtml } from "@/lib/account/export";
import { clearKeys, deriveAuthToken } from "@/lib/crypto/client";
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

      {session !== null && !session.needsPassphraseSetup && session.authCredentialSalt !== null && (
        <ChangeEmailSection authSalt={session.authCredentialSalt} />
      )}

      {session !== null && !session.needsPassphraseSetup && <ChangePassphraseSection />}

      {session !== null && !session.needsPassphraseSetup && <ExportSection />}

      {session?.isAdmin && <InviteSection />}

      {session !== null && !session.needsPassphraseSetup && session.authCredentialSalt !== null && (
        <DeleteAccountSection authSalt={session.authCredentialSalt} />
      )}
    </div>
  );
}

type DeleteState =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "working" }
  | { kind: "error"; message: string };

function DeleteAccountSection({ authSalt }: { authSalt: Uint8Array }) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [state, setState] = useState<DeleteState>({ kind: "idle" });

  async function confirmDelete(event: React.FormEvent) {
    event.preventDefault();
    if (passphrase.length === 0 || state.kind === "working") return;
    setState({ kind: "working" });
    try {
      const token = await deriveAuthToken(passphrase, authSalt);
      await deleteAccount(token);
      // Account and session are gone; drop the in-memory KEK and leave.
      await clearKeys();
      router.replace("/");
    } catch (err) {
      setState({ kind: "error", message: deleteErrorMessage(err) });
    }
  }

  return (
    <PixelCard variant="lifted" accent="pink">
      <h2 className="mb-3 text-[22px] leading-tight font-[var(--font-display)] text-[var(--color-pink)]">
        Delete account
      </h2>
      {state.kind === "idle" ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-[var(--font-body)] opacity-80">
            Permanently deletes your account and every saved clip. This cannot be undone.
          </p>
          <PixelButton
            variant="outline"
            size="md"
            leading={<PixelIcon name="delete" size={16} />}
            onClick={() => setState({ kind: "confirming" })}
          >
            Delete account
          </PixelButton>
        </div>
      ) : (
        <form onSubmit={confirmDelete} className="flex flex-col gap-3">
          <p className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]">
            <span className="font-semibold text-[var(--color-pink)]">This is permanent.</span> All
            your clips are destroyed and can&apos;t be recovered. Enter your passphrase to confirm.
          </p>
          <PixelInput
            type="password"
            autoComplete="current-password"
            placeholder="current passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          {state.kind === "error" && (
            <p
              role="alert"
              className="text-[14px] font-[var(--font-body)] text-[var(--color-pink)]"
            >
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <PixelButton
              type="submit"
              variant="primary"
              size="md"
              disabled={passphrase.length === 0 || state.kind === "working"}
            >
              {state.kind === "working" ? "deleting…" : "Delete forever"}
            </PixelButton>
            <PixelButton
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setPassphrase("");
                setState({ kind: "idle" });
              }}
            >
              Cancel
            </PixelButton>
          </div>
        </form>
      )}
    </PixelCard>
  );
}

function deleteErrorMessage(err: unknown): string {
  if (err instanceof AccountError) {
    if (err.status === 401) return "That passphrase doesn't match.";
    if (err.status === 423) return "Too many attempts. Locked for an hour.";
  }
  return "Couldn't delete your account. Try again.";
}

type ChangeState =
  | { kind: "idle" }
  | { kind: "working"; rewrapped: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

type EmailState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

function ChangeEmailSection({ authSalt }: { authSalt: Uint8Array }) {
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [state, setState] = useState<EmailState>({ kind: "idle" });

  const canSubmit = email.length > 0 && passphrase.length > 0 && state.kind !== "working";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "working" });
    try {
      const token = await deriveAuthToken(passphrase, authSalt);
      await changeEmail(email, token);
      setState({ kind: "sent", email });
      setPassphrase("");
    } catch (err) {
      setState({ kind: "error", message: emailErrorMessage(err) });
    }
  }

  return (
    <SettingsSection title="Email">
      {state.kind === "sent" ? (
        <p className="border-[2px] border-[var(--color-moss)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]">
          Check <span className="font-semibold">{state.email}</span> for a link to confirm the
          change. Until then, your current email still works.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-[14px] font-[var(--font-body)] opacity-80">
            We&apos;ll email a confirmation link to the new address; your old address is notified.
          </p>
          <PixelInput
            type="email"
            autoComplete="email"
            placeholder="new email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PixelInput
            type="password"
            autoComplete="current-password"
            placeholder="current passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          {state.kind === "error" && (
            <p
              role="alert"
              className="text-[14px] font-[var(--font-body)] text-[var(--color-pink)]"
            >
              {state.message}
            </p>
          )}
          <PixelButton type="submit" variant="secondary" size="md" disabled={!canSubmit}>
            {state.kind === "working" ? "sending…" : "Change email"}
          </PixelButton>
        </form>
      )}
    </SettingsSection>
  );
}

function emailErrorMessage(err: unknown): string {
  if (err instanceof AccountError) {
    if (err.status === 401) return "That passphrase doesn't match.";
    if (err.status === 423) return "Too many attempts. Locked for an hour.";
    if (err.status === 409) return "That email is already in use.";
    if (err.status === 400) return "That's already your email.";
  }
  return "Couldn't start the email change. Try again.";
}

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
    if (err.status === 423) return "Too many attempts. Locked for an hour.";
    if (err.status === 409) return "A clip changed mid-update. Try again.";
  }
  return "Couldn't change your passphrase. Try again.";
}

type ExportState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done" }
  | { kind: "error"; message: string };

function ExportSection() {
  const [state, setState] = useState<ExportState>({ kind: "idle" });

  async function run() {
    if (state.kind === "working") return;
    setState({ kind: "working" });
    try {
      const bundle = await fetchExportBundle();
      const html = buildDecryptorHtml(bundle);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wispr-export.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState({ kind: "done" });
    } catch (err) {
      setState({ kind: "error", message: exportErrorMessage(err) });
    }
  }

  return (
    <SettingsSection title="Export">
      <div className="flex flex-col gap-3">
        <p className="text-[14px] font-[var(--font-body)] opacity-80">
          Download all your clips as a single web page that decrypts them right in your browser,
          offline. Keep it somewhere safe — anyone with the file and your passphrase can read your
          synced clips.
        </p>
        {state.kind === "done" && (
          <p className="border-[2px] border-[var(--color-moss)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]">
            Saved <span className="font-semibold">wispr-export.html</span>. Open it in any browser
            and enter your passphrase to decrypt.
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
        <PixelButton
          variant="secondary"
          size="md"
          leading={<PixelIcon name="download" size={16} />}
          onClick={() => void run()}
          disabled={state.kind === "working"}
        >
          {state.kind === "working" ? "preparing…" : "Download export"}
        </PixelButton>
      </div>
    </SettingsSection>
  );
}

function exportErrorMessage(err: unknown): string {
  if (err instanceof AccountError && err.status === 429) {
    return "You can export 3 times a day. Try again later.";
  }
  return "Couldn't build your export. Try again.";
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
