"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { getSession } from "@/lib/api/auth";
import {
  fetchSyncFileUrls,
  listSyncSnippets,
  type ClipContentType,
  type SyncItem,
} from "@/lib/api/sync";
import { deleteSnippet } from "@/lib/api/pin";
import { hasKeys } from "@/lib/crypto/client";
import { downloadClipFile, openClip } from "@/lib/sync/clip";
import { queueCount } from "@/lib/sync/queue";
import { QUEUE_FLUSHED_EVENT } from "@/lib/sync/flush";
import { stashPairDraft } from "@/lib/pair/draft";
import { createLinkShare, createPinShare } from "@/lib/share/create";
import { useOnline } from "@/lib/hooks/useOnline";
import { OfflineBanner } from "@/components/OfflineBanner";
import type { ClipMetadata } from "@/lib/clip/metadata";
import type { Language } from "@/lib/highlight/highlight";

// Reshared clips get a sensible default lifetime; the composer is where a user
// dials in TTL / reads for a fresh share.
const RESHARE_TTL_SECONDS = 3600;

type Gate = "checking" | "redirecting" | "ready";
type FeedStatus = "connecting" | "open" | "reconnecting" | "closed";

interface ClipView {
  id: string;
  contentType: ClipContentType;
  createdAt: string;
  sizeBytes: number;
  decrypted: boolean;
  text?: string;
  fileName?: string;
  fileMime?: string;
  fileBytes?: Uint8Array;
  // Storage-backed file clip: bytes fetched + decrypted on demand at download.
  fetchBytes?: () => Promise<Uint8Array>;
  lang?: Language;
}

// Decrypt a raw feed item into a render model. A failure here is not fatal:
// a single un-decryptable item (e.g. saved under a previous master key) is
// shown with an error affordance rather than tearing down the whole feed.
async function toView(item: SyncItem): Promise<ClipView> {
  const base = {
    id: item.id,
    contentType: item.contentType,
    createdAt: item.createdAt,
    sizeBytes: item.sizeBytes,
  };
  try {
    const { content, metadata } = await openClip(item);
    if (item.contentType === "file") {
      const fileBase = {
        ...base,
        decrypted: true,
        fileName: metadata.name ?? "clip",
        fileMime: metadata.mime ?? "application/octet-stream",
      };
      // Storage-backed clip: bytes live in R2, fetched + decrypted on download.
      if (item.chunkCount !== null) {
        return {
          ...fileBase,
          fetchBytes: async () => downloadClipFile(item, await fetchSyncFileUrls(item.id)),
        };
      }
      return { ...fileBase, fileBytes: content };
    }
    const view: ClipView = {
      ...base,
      decrypted: true,
      text: new TextDecoder().decode(content),
    };
    if (metadata.lang) view.lang = metadata.lang;
    return view;
  } catch {
    return { ...base, decrypted: false };
  }
}

export function ClipsFeed() {
  const router = useRouter();
  const online = useOnline();
  const [gate, setGate] = useState<Gate>("checking");
  const [items, setItems] = useState<ClipView[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);

  // Replace the first page from the server — used on the initial load and
  // after the offline queue flushes so newly-synced clips show immediately.
  const loadFirstPage = useCallback(async () => {
    const page = await listSyncSnippets();
    const views = await Promise.all(page.items.map(toView));
    setItems(views);
    setNextBefore(page.nextBefore);
  }, []);

  // Gate + initial load. Signed-out or locked sessions can't decrypt anything,
  // so they're bounced to the right surface before any fetch.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getSession();
      if (cancelled) return;
      if (session === null) {
        setGate("redirecting");
        router.replace("/login");
        return;
      }
      if (session.needsPassphraseSetup) {
        setGate("redirecting");
        router.replace("/setup-passphrase");
        return;
      }
      if (!(await hasKeys())) {
        if (cancelled) return;
        setGate("redirecting");
        router.replace(`/unlock?next=${encodeURIComponent("/me")}`);
        return;
      }
      if (cancelled) return;
      setGate("ready");
      try {
        await loadFirstPage();
      } catch {
        if (!cancelled) setError("Couldn't load your clips. Try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loadFirstPage]);

  // Offline-queue awareness. The app-wide flusher (mounted in the layout) does
  // the actual sending; here we just track the count for the "Queued (N)" pill
  // and refetch once a flush lands so the newly-synced clips appear.
  useEffect(() => {
    if (gate !== "ready") return;
    let cancelled = false;
    const recount = () => {
      void queueCount()
        .then((n) => {
          if (!cancelled) setQueued(n);
        })
        .catch(() => {});
    };
    recount();
    const onFlushed = () => {
      recount();
      void loadFirstPage().catch(() => {});
    };
    window.addEventListener(QUEUE_FLUSHED_EVENT, onFlushed);
    window.addEventListener("online", recount);
    window.addEventListener("offline", recount);
    return () => {
      cancelled = true;
      window.removeEventListener(QUEUE_FLUSHED_EVENT, onFlushed);
      window.removeEventListener("online", recount);
      window.removeEventListener("offline", recount);
    };
  }, [gate, loadFirstPage]);

  // Live updates: prepend created clips, drop deleted ones. Only runs once the
  // session is confirmed unlocked so the socket isn't opened for a guest.
  useEffect(() => {
    if (gate !== "ready") return;
    let feed: { close(): void } | null = null;
    let closed = false;
    void import("@/lib/sync/feed-ws").then(({ openSyncFeed }) => {
      if (closed) return;
      feed = openSyncFeed({
        onCreated: (item) => {
          void toView(item).then((view) => {
            setItems((prev) => (prev.some((c) => c.id === view.id) ? prev : [view, ...prev]));
          });
        },
        onDeleted: (id) => setItems((prev) => prev.filter((c) => c.id !== id)),
        onStatus: setFeedStatus,
      });
    });
    return () => {
      closed = true;
      feed?.close();
    };
  }, [gate]);

  const loadMore = useCallback(async () => {
    if (nextBefore === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listSyncSnippets(nextBefore);
      const views = await Promise.all(page.items.map(toView));
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...views.filter((v) => !seen.has(v.id))];
      });
      setNextBefore(page.nextBefore);
    } catch {
      setError("Couldn't load older clips. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextBefore, loadingMore]);

  const remove = useCallback(async (id: string) => {
    // Optimistic: drop it now; the WS delete event (and our own request) agree.
    setItems((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteSnippet(id);
    } catch {
      setError("Couldn't delete that clip. Reload to resync.");
    }
  }, []);

  const copyText = useCallback(async (view: ClipView) => {
    if (view.text === undefined) return;
    try {
      await navigator.clipboard.writeText(view.text);
      setCopiedId(view.id);
      window.setTimeout(() => setCopiedId((c) => (c === view.id ? null : c)), 1500);
    } catch {
      // Clipboard denied (insecure context); nothing actionable to show.
    }
  }, []);

  if (gate !== "ready") {
    return (
      <PixelCard variant="lifted" className="p-6 md:p-8">
        <div className="flex items-center gap-4">
          <WispMascot state="idle" size={2} />
          <p className="text-[16px] font-[var(--font-body)]">
            {gate === "redirecting" ? "one moment…" : "loading your clips…"}
          </p>
        </div>
      </PixelCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {queued > 0 && (
        <div>
          <PixelBadge tone="warn">
            <PixelIcon name="cellular-signal-off" size={12} />
            queued <span className="num">({queued})</span>
          </PixelBadge>
        </div>
      )}

      {!online && (
        <OfflineBanner note="Showing your loaded clips. New saves are queued and sync when you reconnect." />
      )}

      {feedStatus === "reconnecting" && online && (
        <p className="text-[12px] font-[var(--font-body)] opacity-70">
          <span className="num">live updates reconnecting…</span>
        </p>
      )}

      {error !== null && (
        <p
          role="alert"
          className="border-[2px] border-[var(--color-pink)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]"
        >
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState onCompose={() => router.push("/")} />
      ) : (
        items.map((view) => (
          <ClipRow
            key={view.id}
            view={view}
            copied={copiedId === view.id}
            onCopy={() => void copyText(view)}
            onDownload={() => void downloadFile(view)}
            onDelete={() => void remove(view.id)}
          />
        ))
      )}

      {nextBefore !== null && (
        <PixelButton
          variant="ghost"
          size="md"
          block
          onClick={() => void loadMore()}
          disabled={loadingMore}
        >
          {loadingMore ? "loading…" : "Load older"}
        </PixelButton>
      )}
    </div>
  );
}

type ReshareState =
  | { kind: "idle" }
  | { kind: "menu" }
  | { kind: "working" }
  | { kind: "link"; url: string }
  | { kind: "pin"; pin: string; url: string }
  | { kind: "error"; msg: string };

// Reconstruct the create inputs from an already-decrypted clip: text-likes
// round-trip through UTF-8, files carry their raw bytes + name/mime.
function reshareInputs(
  view: ClipView,
): { contentType: ClipContentType; bytes: Uint8Array; metadata: ClipMetadata } | null {
  if (!view.decrypted) return null;
  if (view.contentType === "file") {
    if (view.fileBytes === undefined) return null;
    const metadata: ClipMetadata = { v: 1 };
    if (view.fileName) metadata.name = view.fileName;
    if (view.fileMime) metadata.mime = view.fileMime;
    return { contentType: "file", bytes: view.fileBytes, metadata };
  }
  const metadata: ClipMetadata = view.lang ? { v: 1, lang: view.lang } : { v: 1 };
  return {
    contentType: view.contentType,
    bytes: new TextEncoder().encode(view.text ?? ""),
    metadata,
  };
}

function ClipRow({
  view,
  copied,
  onCopy,
  onDownload,
  onDelete,
}: {
  view: ClipView;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [reshare, setReshare] = useState<ReshareState>({ kind: "idle" });
  // Pair is a live channel: only text-likes can be pre-loaded into it.
  const canPair = view.contentType !== "file";

  async function toLink() {
    const inputs = reshareInputs(view);
    if (inputs === null) return;
    setReshare({ kind: "working" });
    try {
      const { url } = await createLinkShare(inputs.contentType, inputs.bytes, inputs.metadata, {
        ttlSeconds: RESHARE_TTL_SECONDS,
        maxReads: 1,
      });
      await copyToClipboard(url);
      setReshare({ kind: "link", url });
    } catch (err) {
      setReshare({ kind: "error", msg: err instanceof Error ? err.message : "reshare failed" });
    }
  }

  async function toPin() {
    const inputs = reshareInputs(view);
    if (inputs === null) return;
    setReshare({ kind: "working" });
    try {
      const { pin, url } = await createPinShare(inputs.contentType, inputs.bytes, inputs.metadata, {
        ttlSeconds: RESHARE_TTL_SECONDS,
        maxReads: null,
      });
      await copyToClipboard(url);
      setReshare({ kind: "pin", pin, url });
    } catch (err) {
      setReshare({ kind: "error", msg: err instanceof Error ? err.message : "reshare failed" });
    }
  }

  function toPair() {
    if (view.text === undefined) return;
    stashPairDraft(view.text);
    router.push("/pair");
  }

  return (
    <PixelCard variant="lifted">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PixelBadge tone={view.decrypted ? "info" : "error"}>
              <PixelIcon name={typeIcon(view.contentType)} size={12} />
              {view.decrypted ? (view.lang ?? view.contentType) : "can't decrypt"}
            </PixelBadge>
            <span className="num text-[12px] font-[var(--font-mono)] opacity-70">
              {formatWhen(view.createdAt)} · {formatBytes(view.sizeBytes)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {view.decrypted && view.contentType !== "file" && (
              <IconAction label={copied ? "copied" : "copy"} icon="copy" onClick={onCopy} />
            )}
            {view.decrypted && view.contentType === "file" && (
              <IconAction label="download" icon="download" onClick={onDownload} />
            )}
            {view.decrypted && (
              <IconAction
                label="reshare"
                icon="arrow-right"
                onClick={() =>
                  setReshare((r) => (r.kind === "idle" ? { kind: "menu" } : { kind: "idle" }))
                }
              />
            )}
            <IconAction label="delete" icon="delete" onClick={onDelete} tone="danger" />
          </div>
        </div>

        {view.decrypted ? (
          view.contentType === "file" ? (
            <p className="truncate text-[16px] font-[var(--font-body)]">{view.fileName}</p>
          ) : (
            <pre className="max-h-48 overflow-auto border-[2px] border-[var(--border)] bg-[var(--bg-sunk)] p-3 text-[14px] font-[var(--font-mono)] break-words whitespace-pre-wrap">
              {view.text}
            </pre>
          )
        ) : (
          <p className="text-[14px] font-[var(--font-body)] opacity-70">
            This clip was saved under a different passphrase and can&apos;t be read in this session.
          </p>
        )}

        {reshare.kind !== "idle" && (
          <ResharePanel
            state={reshare}
            canPair={canPair}
            onLink={() => void toLink()}
            onPin={() => void toPin()}
            onPair={toPair}
            onCopy={() => {
              const url = reshare.kind === "link" || reshare.kind === "pin" ? reshare.url : null;
              if (url) void copyToClipboard(url);
            }}
            onClose={() => setReshare({ kind: "idle" })}
          />
        )}
      </div>
    </PixelCard>
  );
}

function ResharePanel({
  state,
  canPair,
  onLink,
  onPin,
  onPair,
  onCopy,
  onClose,
}: {
  state: ReshareState;
  canPair: boolean;
  onLink: () => void;
  onPin: () => void;
  onPair: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-[2px] border-[var(--color-purple)] bg-[var(--bg-sunk)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-[var(--font-display)] tracking-widest uppercase opacity-80">
          re-send as
        </span>
        <IconAction label="close" icon="close" onClick={onClose} />
      </div>

      {state.kind === "working" ? (
        <p className="text-[14px] font-[var(--font-body)] opacity-80">encrypting…</p>
      ) : state.kind === "link" || state.kind === "pin" ? (
        <div className="flex flex-col gap-2">
          {state.kind === "pin" && (
            <p className="text-[14px] font-[var(--font-body)]">
              PIN <span className="num text-[16px] font-[var(--font-mono)]">{state.pin}</span>
            </p>
          )}
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 text-[12px]">
              {state.url}
            </code>
            <IconAction label="copy" icon="copy" onClick={onCopy} />
          </div>
          <p className="text-[12px] font-[var(--font-body)] opacity-60">
            copied to clipboard · expires in 1 hr
          </p>
        </div>
      ) : state.kind === "error" ? (
        <p className="text-[14px] font-[var(--font-body)] text-[var(--color-pink)]">{state.msg}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <PixelButton
            variant="secondary"
            size="sm"
            leading={<PixelIcon name="link" size={12} />}
            onClick={onLink}
          >
            Link
          </PixelButton>
          <PixelButton
            variant="secondary"
            size="sm"
            leading={<PixelIcon name="lock" size={12} />}
            onClick={onPin}
          >
            PIN
          </PixelButton>
          {canPair && (
            <PixelButton
              variant="secondary"
              size="sm"
              leading={<PixelIcon name="devices" size={12} />}
              onClick={onPair}
            >
              Pair
            </PixelButton>
          )}
        </div>
      )}
    </div>
  );
}

// Best-effort clipboard write; denied in non-secure contexts (dev).
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The URL stays visible in the panel for manual copy.
  }
}

function IconAction({
  label,
  icon,
  onClick,
  tone,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 text-[12px] font-[var(--font-display)] tracking-widest uppercase shadow-[2px_2px_0_0_var(--border)]" +
        (tone === "danger" ? " text-[var(--color-pink)]" : " text-[var(--fg)]")
      }
    >
      <PixelIcon name={icon} size={12} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <PixelCard variant="lifted" accent="purple" className="p-6 md:p-8">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <WispMascot state="sleeping" size={2} />
          <div>
            <h2 className="text-[22px] leading-tight font-[var(--font-display)]">
              nothing saved yet
            </h2>
            <p className="mt-1 text-[14px] font-[var(--font-body)] opacity-80">
              Save a clip from the composer and it lands here, encrypted.
            </p>
          </div>
        </div>
        <PixelButton
          variant="secondary"
          size="md"
          leading={<PixelIcon name="plus" size={16} />}
          onClick={onCompose}
        >
          Compose a clip
        </PixelButton>
      </div>
    </PixelCard>
  );
}

async function downloadFile(view: ClipView): Promise<void> {
  // Inline clips already hold their bytes; storage-backed clips fetch + decrypt
  // on demand.
  const bytes = view.fileBytes ?? (view.fetchBytes ? await view.fetchBytes() : undefined);
  if (bytes === undefined) return;
  const blob = new Blob([bytes], {
    type: view.fileMime ?? "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = view.fileName ?? "clip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function typeIcon(contentType: ClipContentType): string {
  switch (contentType) {
    case "code":
      return "code";
    case "url":
      return "link";
    case "file":
      return "file";
    default:
      return "align-left";
  }
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KiB`;
  return `${(kb / 1024).toFixed(1)} MiB`;
}
