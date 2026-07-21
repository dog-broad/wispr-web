"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { WispMascot } from "@/components/pixel/WispMascot";
import { getSession } from "@/lib/api/auth";
import { listSyncSnippets, type ClipContentType, type SyncItem } from "@/lib/api/sync";
import { deleteSnippet } from "@/lib/api/pin";
import { hasKeys } from "@/lib/crypto/client";
import { openClip } from "@/lib/sync/clip";
import type { Language } from "@/lib/highlight/highlight";

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
  lang?: Language;
}

// Decrypt a raw feed item into a render model. A failure here is not fatal —
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
      return {
        ...base,
        decrypted: true,
        fileName: metadata.name ?? "clip",
        fileMime: metadata.mime ?? "application/octet-stream",
        fileBytes: content,
      };
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
  const [gate, setGate] = useState<Gate>("checking");
  const [items, setItems] = useState<ClipView[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        const page = await listSyncSnippets();
        if (cancelled) return;
        const views = await Promise.all(page.items.map(toView));
        if (cancelled) return;
        setItems(views);
        setNextBefore(page.nextBefore);
      } catch {
        if (!cancelled) setError("Couldn't load your clips. Try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
      {feedStatus === "reconnecting" && (
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
            onDownload={() => downloadFile(view)}
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
      </div>
    </PixelCard>
  );
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

function downloadFile(view: ClipView): void {
  if (view.fileBytes === undefined) return;
  const blob = new Blob([view.fileBytes], {
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
