"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelPill } from "@/components/pixel/PixelPill";
import { PixelSelectPill } from "@/components/pixel/PixelSelectPill";
import { PixelTextarea } from "@/components/pixel/PixelInput";
import { WispMascot } from "@/components/pixel/WispMascot";
import type { ClipMetadata } from "@/lib/clip/metadata";
import { base64Encode } from "@/lib/crypto/encoding";
import { derivePasswordHash, generatePasswordSalt } from "@/lib/crypto/password";
import { createLinkShare, createPinShare, type PasswordGate } from "@/lib/share/create";
import { detectLanguage } from "@/lib/highlight/detect";
import { detectUrl } from "@/lib/url-preview/detect";
import { useSession } from "@/lib/hooks/useSession";
import type { SentDetails } from "./SentState";

// Draft text stashed here when a Save-to-clips attempt finds the passphrase
// locked, so redirecting to /unlock and back doesn't lose what was typed.
const DRAFT_KEY = "wispr-draft";

// SentState carries the QR renderer (qrcode.react) which is only needed
// after a successful send. Lazy-loading it keeps that dependency out of
// the initial home-page bundle so the first paint is light.
const SentState = dynamic(() => import("./SentState").then((m) => ({ default: m.SentState })), {
  loading: () => null,
  ssr: false,
});

type Status =
  | { kind: "idle" }
  | { kind: "encrypting" }
  | { kind: "posting" }
  | { kind: "sent"; details: SentDetails }
  | { kind: "saved"; id: string }
  | { kind: "failed"; reason: string };

const LIFETIME_OPTIONS = [
  { value: 600, label: "10 min" },
  { value: 3600, label: "1 hr" },
  { value: 86400, label: "24 hr" },
] as const;

// PIN-share read ceilings. 0 is the sentinel for "unlimited within the TTL",
// mapped to null on the wire.
const READS_OPTIONS = [
  { value: 1, label: "1" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 0, label: "∞" },
] as const;

// Inline-file ceiling for Link mode. PROJECT.md §10 M2: 256 KiB
// inline; R2-backed larger uploads land in M3. The API cap on
// ciphertext bytes is set with this in mind.
const MAX_INLINE_FILE_BYTES = 256 * 1024;

export function Composer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState<number>(600);
  const [maxReads, setMaxReads] = useState<number>(1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState<"link" | "pin" | "sync" | null>(null);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useSession();
  const signedIn = session !== null;

  // Content-type detection runs on every keystroke. URL takes priority
  // over language because a single-URL share gets its own rich preview
  // surface on receive — code-like detection inside a URL string would
  // misclassify (URL paths happen to contain JS-ish punctuation).
  const detectedUrl = attachedFile === null ? detectUrl(text) : null;
  const detectedLanguage =
    attachedFile === null && detectedUrl === null ? detectLanguage(text) : null;

  const send = useCallback(
    async (mode: "link" | "pin" | "sync") => {
      if (attachedFile === null && !text.trim()) return;
      setPending(mode);
      setStatus({ kind: "encrypting" });
      try {
        let contentBytes: Uint8Array;
        let metadata: ClipMetadata;
        let contentType: "text" | "code" | "url" | "file";

        if (attachedFile !== null) {
          contentBytes = new Uint8Array(await attachedFile.arrayBuffer());
          metadata = {
            v: 1,
            name: attachedFile.name,
            mime: attachedFile.type || "application/octet-stream",
          };
          contentType = "file";
        } else {
          contentBytes = new TextEncoder().encode(text);
          // Re-run detection at send time so the body reflects the final
          // textarea state regardless of any intermediate edits.
          const urlAtSend = detectUrl(text);
          const langAtSend = urlAtSend === null ? detectLanguage(text) : null;
          metadata = langAtSend === null ? { v: 1 } : { v: 1, lang: langAtSend };
          contentType = urlAtSend !== null ? "url" : langAtSend !== null ? "code" : "text";
        }

        if (mode === "sync") {
          // Mode 4: seal under a per-clip DEK wrapped by the master KEK. That
          // KEK lives only in this tab's worker, so a locked tab must unlock
          // first — stash the draft and bounce through /unlock so nothing typed
          // is lost.
          const { hasKeys } = await import("@/lib/crypto/client");
          if (!(await hasKeys())) {
            try {
              window.sessionStorage.setItem(DRAFT_KEY, text);
            } catch {
              // Private-mode / storage-disabled: proceed without the stash.
            }
            router.push(`/unlock?next=${encodeURIComponent("/")}`);
            return;
          }
          const { sealClip } = await import("@/lib/sync/clip");
          const { createSyncSnippet } = await import("@/lib/api/sync");
          const sealed = await sealClip(contentBytes, metadata);
          setStatus({ kind: "posting" });
          const id = await createSyncSnippet(contentType, sealed);
          setStatus({ kind: "saved", id });
          return;
        }

        // Compute the optional password gate: PBKDF2 runs client-side so the
        // raw password never reaches the server — only the derived hash + salt.
        let passwordGate: PasswordGate | undefined;
        if (passwordEnabled && password.length > 0) {
          const salt = generatePasswordSalt();
          const hash = await derivePasswordHash(password, salt);
          passwordGate = { passwordHash: base64Encode(hash), passwordSalt: base64Encode(salt) };
        }

        setStatus({ kind: "posting" });

        if (mode === "pin") {
          // max_reads 0 in the picker means unlimited → null on the wire.
          const wireMaxReads = maxReads === 0 ? null : maxReads;
          const { id, pin, url, expiresAt } = await createPinShare(
            contentType,
            contentBytes,
            metadata,
            {
              ttlSeconds,
              maxReads: wireMaxReads,
              password: passwordGate,
            },
          );
          setStatus({
            kind: "sent",
            details: {
              id,
              url,
              copied: await copyToClipboard(url),
              expiresAt,
              kind: "pin",
              pin,
              maxReads: wireMaxReads,
            },
          });
          return;
        }

        const { id, url, expiresAt } = await createLinkShare(contentType, contentBytes, metadata, {
          ttlSeconds,
          maxReads: 1,
          password: passwordGate,
        });
        setStatus({
          kind: "sent",
          details: {
            id,
            url,
            copied: await copyToClipboard(url),
            expiresAt,
            kind: "link",
            maxReads: 1,
          },
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "failed", reason });
      } finally {
        setPending(null);
      }
    },
    [attachedFile, maxReads, password, passwordEnabled, router, text, ttlSeconds],
  );

  // Restore a draft stashed before an unlock detour (see the sync branch).
  useEffect(() => {
    let stashed: string | null = null;
    try {
      stashed = window.sessionStorage.getItem(DRAFT_KEY);
      if (stashed !== null) window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      stashed = null;
    }
    if (stashed) setText(stashed);
  }, []);

  function reset() {
    setText("");
    setAttachedFile(null);
    setAttachError(null);
    setTtlSeconds(600);
    setMaxReads(1);
    setPasswordEnabled(false);
    setPassword("");
    setStatus({ kind: "idle" });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      // Cmd+Enter saves to My clips when signed in; otherwise gets a link.
      void send(signedIn ? "sync" : "link");
    }
  }

  function onFilePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be re-selected after a failed
    // attempt or after the user clears it.
    event.target.value = "";
    if (!file) return;
    setAttachError(null);
    if (file.size > MAX_INLINE_FILE_BYTES) {
      setAttachError(
        `file too large — max ${formatBytes(MAX_INLINE_FILE_BYTES)} inline; larger uploads ship in the next milestone.`,
      );
      return;
    }
    setAttachedFile(file);
  }

  function clearAttachment() {
    setAttachedFile(null);
    setAttachError(null);
  }

  if (status.kind === "sent") {
    return <SentState details={status.details} onSendAnother={reset} />;
  }

  if (status.kind === "saved") {
    return <SavedState onSaveAnother={reset} />;
  }

  const busy = status.kind === "encrypting" || status.kind === "posting";
  const sendDisabled =
    busy || (attachedFile === null && !text.trim()) || (passwordEnabled && password.length === 0);
  const linkBase = attachedFile !== null ? "Send file" : "Get a link";
  // The in-flight button shows progress; the rest keep their resting label.
  const actionLabel = (mode: "link" | "pin" | "sync", base: string): string =>
    pending === mode
      ? status.kind === "encrypting"
        ? "Encrypting…"
        : mode === "sync"
          ? "Saving…"
          : "Sending…"
      : base;

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:-top-12 md:right-8 md:block">
        <WispMascot state="wave" size={3} />
      </div>

      <PixelCard variant="lifted" accent="pink">
        <div className="flex flex-col gap-4">
          {attachedFile === null ? (
            <PixelTextarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type or paste anything.
text — code — urls — files (up to 256 KiB)
Encrypted in your browser before it leaves."
              rows={6}
              aria-label="Content to send"
            />
          ) : (
            <FileAttachmentRow file={attachedFile} onClear={clearAttachment} />
          )}

          {attachError !== null && (
            <p className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]">
              <span className="font-semibold text-[var(--color-pink)]">Couldn&apos;t attach.</span>{" "}
              <span className="opacity-80">{attachError}</span>
            </p>
          )}

          {passwordEnabled && (
            <PasswordRow value={password} onChange={setPassword} disabled={busy} />
          )}

          <div className="flex flex-wrap gap-2">
            <PixelSelectPill
              icon={<PixelIcon name="clock" size={12} />}
              label="lifetime"
              value={ttlSeconds}
              options={LIFETIME_OPTIONS}
              onChange={setTtlSeconds}
            />
            {signedIn ? (
              <PixelSelectPill
                icon={<PixelIcon name="eye" size={12} />}
                label="reads"
                value={maxReads}
                options={READS_OPTIONS}
                onChange={setMaxReads}
              />
            ) : (
              <PixelPill
                icon={<PixelIcon name="eye" size={12} />}
                label="reads"
                value="1"
                disabled
                title="Link burns after one read; sign in for multi-read PINs"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setPasswordEnabled((current) => {
                  const next = !current;
                  if (!next) setPassword("");
                  return next;
                });
              }}
              disabled={busy}
              className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-0.5 text-[12px] font-[var(--font-display)] tracking-widest text-[var(--fg)] uppercase shadow-[2px_2px_0_0_var(--border)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-pressed={passwordEnabled}
              title="Optional password gate on top of the URL key"
            >
              <PixelIcon name="lock" size={12} />
              password
              <span className="num opacity-70">{passwordEnabled ? "on" : "off"}</span>
            </button>
            {detectedUrl !== null && (
              <PixelPill
                icon={<PixelIcon name="link" size={12} />}
                label="url"
                value={detectedUrl.hostname}
                title="URL detected — receiver will see a link preview"
              />
            )}
            {detectedLanguage !== null && (
              <PixelPill
                icon={<PixelIcon name="code" size={12} />}
                label="code"
                value={detectedLanguage}
                title="Code detected — receiver will see syntax highlighting"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFilePick}
              aria-label="Attach a file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachedFile !== null || busy}
              className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-0.5 text-[12px] font-[var(--font-display)] tracking-widest text-[var(--fg)] uppercase shadow-[2px_2px_0_0_var(--border)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Attach a file (up to 256 KiB)"
            >
              <PixelIcon name="attachment" size={12} />
              attach
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {signedIn && (
              // Members: saving to My clips is the default action (Cmd+Enter).
              <PixelButton
                variant="primary"
                size="lg"
                block
                leading={<PixelIcon name="bookmark" size={20} />}
                trailing={
                  <kbd className="ml-1 inline-flex items-center gap-1 border-2 border-current px-1.5 py-0.5 text-[12px] font-[var(--font-mono)]">
                    <PixelIcon name="command" size={12} />↵
                  </kbd>
                }
                onClick={() => send("sync")}
                disabled={sendDisabled}
                title="Encrypt and keep in your private clips"
              >
                {actionLabel("sync", "Save to my clips")}
              </PixelButton>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PixelButton
                variant={signedIn ? "secondary" : "primary"}
                size="lg"
                block
                leading={<PixelIcon name={attachedFile !== null ? "file" : "link"} size={20} />}
                trailing={
                  signedIn ? undefined : (
                    <kbd className="ml-1 inline-flex items-center gap-1 border-2 border-current px-1.5 py-0.5 text-[12px] font-[var(--font-mono)]">
                      <PixelIcon name="command" size={12} />↵
                    </kbd>
                  )
                }
                onClick={() => send("link")}
                disabled={sendDisabled}
              >
                {actionLabel("link", linkBase)}
              </PixelButton>
              <PixelButton
                variant="secondary"
                size="lg"
                block
                leading={<PixelIcon name="lock" size={20} />}
                onClick={() => send("pin")}
                disabled={!signedIn || sendDisabled}
                title={signedIn ? "Share by PIN (members)" : "Sign in to share by PIN"}
              >
                {actionLabel("pin", "Get a PIN")}
              </PixelButton>
            </div>
          </div>

          {status.kind === "failed" ? (
            <p className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]">
              <span className="font-semibold text-[var(--color-pink)]">Could not send.</span>{" "}
              <span className="num opacity-90">{status.reason}</span>
            </p>
          ) : (
            <p className="flex items-center gap-2 text-[14px] font-[var(--font-body)] opacity-70">
              <span className="md:hidden">
                <WispMascot state="linking" size={2} animate={false} />
              </span>
              {signedIn ? (
                <span>
                  Only holders of the link or PIN can read it. Pick reads + lifetime above, then Get
                  a PIN to share with a group.
                </span>
              ) : (
                <span>
                  Only the link-holder can read it.{" "}
                  <Link href="/login" className="underline">
                    Sign in
                  </Link>{" "}
                  to share by PIN — easier for groups.
                </span>
              )}
            </p>
          )}
        </div>
      </PixelCard>
    </section>
  );
}

function SavedState({ onSaveAnother }: { onSaveAnother: () => void }) {
  const router = useRouter();
  return (
    <section className="relative">
      <PixelCard variant="lifted" accent="moss">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <WispMascot state="success" size={2} />
            <div>
              <h2 className="text-[22px] leading-tight font-[var(--font-display)]">
                saved to your clips
              </h2>
              <p className="mt-1 text-[14px] font-[var(--font-body)] opacity-80">
                Encrypted in your browser and kept in your private history.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PixelButton
              variant="primary"
              size="lg"
              block
              leading={<PixelIcon name="bookmark" size={20} />}
              onClick={() => router.push("/me")}
            >
              View my clips
            </PixelButton>
            <PixelButton
              variant="secondary"
              size="lg"
              block
              leading={<PixelIcon name="plus" size={20} />}
              onClick={onSaveAnother}
            >
              Save another
            </PixelButton>
          </div>
        </div>
      </PixelCard>
    </section>
  );
}

function PasswordRow({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-[2px] border-[var(--color-purple)] bg-[var(--bg-sunk)] px-3 py-2">
      <label className="text-[12px] font-[var(--font-display)] tracking-widest uppercase opacity-80">
        password gate
      </label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="receiver types this to unlock"
        className="border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-3 py-2 text-[16px] font-[var(--font-mono)] focus:border-[var(--color-pink)] focus:outline-none"
        aria-label="Snippet password"
      />
      <p className="text-[12px] font-[var(--font-body)] opacity-70">
        Access-control only — the URL key still decrypts the content. Use a secret phrase you can
        share out-of-band.
      </p>
    </div>
  );
}

function FileAttachmentRow({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] px-4 py-3">
      <PixelIcon name="file" size={24} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-[var(--font-body)] font-semibold">{file.name}</p>
        <p className="num text-[12px] font-[var(--font-mono)] opacity-70">
          {formatBytes(file.size)}
          {file.type && <> · {file.type}</>}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove attachment"
        className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 text-[12px] font-[var(--font-display)] tracking-widest text-[var(--fg)] uppercase shadow-[2px_2px_0_0_var(--border)]"
      >
        <PixelIcon name="close" size={12} />
        clear
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KiB`;
  return `${(kb / 1024).toFixed(1)} MiB`;
}

// Best-effort clipboard write. Some contexts deny it (e.g. non-secure
// contexts in dev); callers still show the URL + a manual copy button.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
