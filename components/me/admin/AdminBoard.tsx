"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { useSession } from "@/lib/hooks/useSession";
import {
  getDashboard,
  openAdminFeed,
  runBackup,
  runPurge,
  toggleKillSwitch,
  type AuditEntry,
  type Dashboard,
  type Metric,
  type MetricStatus,
} from "@/lib/api/admin";

// The console has a deliberately distinct, terminal-dense voice (mono
// throughout, colour used only for signal). Status → colour:
const STATUS_COLOR: Record<MetricStatus, string> = {
  ok: "var(--color-moss)",
  warn: "var(--color-marigold)",
  alert: "var(--color-pink)",
  unknown: "var(--color-marigold)",
};

function StatusDot({ status }: { status: MetricStatus }) {
  const glyph = status === "unknown" ? "?" : "●";
  return (
    <span
      aria-hidden
      className="num inline-block w-4 text-center font-[var(--font-mono)] text-[16px] leading-none"
      style={{ color: STATUS_COLOR[status] }}
    >
      {glyph}
    </span>
  );
}

function MetricRow({ metric }: { metric: Metric }) {
  return (
    <div
      className="flex items-baseline gap-2 py-0.5 font-[var(--font-mono)] text-[16px]"
      title={metric.detail ?? undefined}
    >
      <StatusDot status={metric.status} />
      <span className="w-40 shrink-0 opacity-80">{metric.label}</span>
      <span className="num flex-1 break-all">
        {metric.value ?? <span className="opacity-50">— no data —</span>}
      </span>
    </div>
  );
}

const BAR_WIDTH = 10;

function QuotaRow({ metric }: { metric: Metric }) {
  let bar: string;
  if (metric.status === "unknown" || metric.used == null || !metric.total) {
    bar = "─ no cap ─";
  } else {
    const filled = Math.min(BAR_WIDTH, Math.round((metric.used / metric.total) * BAR_WIDTH));
    bar = "▓".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
  }
  return (
    <div
      className="flex items-baseline gap-2 py-0.5 font-[var(--font-mono)] text-[16px]"
      title={metric.detail ?? undefined}
    >
      <StatusDot status={metric.status} />
      <span className="w-28 shrink-0 opacity-80">{metric.label}</span>
      <span className="num shrink-0" style={{ color: STATUS_COLOR[metric.status] }}>
        {bar}
      </span>
      <span className="num flex-1 opacity-90">
        {metric.value ?? <span className="opacity-50">?</span>}
      </span>
    </div>
  );
}

function Panel({
  title,
  anchorRef,
  children,
}: {
  title: string;
  anchorRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <section
      ref={anchorRef}
      className="border-[3px] border-[var(--border)] bg-[var(--bg-lifted)] shadow-[4px_4px_0_0_var(--border)]"
    >
      <h2 className="border-b-[2px] border-[var(--border)] bg-[var(--bg-sunk)] px-3 py-1.5 font-[var(--font-mono)] text-[14px] tracking-widest uppercase opacity-80">
        {title}
      </h2>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

const EXTERNAL_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Sentry", href: "https://sentry.io" },
  { label: "Resend", href: "https://resend.com/overview" },
  { label: "Cloudflare", href: "https://dash.cloudflare.com" },
  { label: "Vercel", href: "https://vercel.com/dashboard" },
];

type Gate = "checking" | "redirecting" | "ready";

export function AdminBoard() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [gate, setGate] = useState<Gate>("checking");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const quotasRef = useRef<HTMLDivElement>(null);
  const healthRef = useRef<HTMLDivElement>(null);
  const auditRef = useRef<HTMLDivElement>(null);

  // Gate: signed-in admins only.
  useEffect(() => {
    if (loading) return;
    if (session === null) {
      setGate("redirecting");
      router.replace("/login");
      return;
    }
    if (!session.isAdmin) {
      setGate("redirecting");
      router.replace("/");
      return;
    }
    setGate("ready");
  }, [loading, session, router]);

  const refresh = useCallback(async () => {
    try {
      setDashboard(await getDashboard());
    } catch {
      setNote("couldn't load the dashboard");
    }
  }, []);

  // Initial fetch + live feed.
  useEffect(() => {
    if (gate !== "ready") return;
    void refresh();
    const close = openAdminFeed({
      onSnapshot: (d) => setDashboard(d),
      onDelta: (delta) =>
        setDashboard((prev) => {
          if (prev === null) return prev;
          const patched = delta.metrics
            ? applyDelta(prev, delta.metrics)
            : { ...prev, status: delta.status };
          patched.status = delta.status;
          if (delta.recent_actions) patched.recent_actions = delta.recent_actions;
          return patched;
        }),
      onStatus: (s) => setLive(s === "open"),
    });
    return close;
  }, [gate, refresh]);

  // Keyboard nav: `g q` / `g h` / `g a` jump; `r` refresh.
  useEffect(() => {
    if (gate !== "ready") return;
    let pendingG = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "g") {
        pendingG = true;
        return;
      }
      if (pendingG) {
        const map: Record<string, React.RefObject<HTMLDivElement | null>> = {
          q: quotasRef,
          h: healthRef,
          a: auditRef,
        };
        map[e.key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        pendingG = false;
        return;
      }
      if (e.key === "r") void refresh();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gate, refresh]);

  const doAction = useCallback(
    async (id: string, run: () => Promise<string>) => {
      setBusy(id);
      setNote(null);
      try {
        setNote(await run());
        await refresh();
      } catch {
        setNote(`${id} failed`);
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  if (gate !== "ready" || dashboard === null) {
    return (
      <p className="py-16 text-center font-[var(--font-mono)] text-[16px] opacity-70">
        {gate === "redirecting" ? "redirecting…" : "loading console…"}
      </p>
    );
  }

  const switchState = (name: string): boolean =>
    dashboard.ops.find((m) => m.key === `switch_${name}`)?.value === "on";

  return (
    <div className="anim-drift-in py-6 font-[var(--font-mono)]">
      {/* Banner */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] px-3 py-2 text-[16px]">
        <span className="flex items-center gap-2 font-semibold">
          <StatusDot status={dashboard.status} />
          {dashboard.status === "ok"
            ? "all systems normal"
            : dashboard.status === "warn"
              ? "attention — something is approaching a limit"
              : "alert — a metric is critical"}
        </span>
        <span className="num opacity-60">
          {new Date(dashboard.generated_at).toLocaleTimeString()}
        </span>
        <span className="opacity-60">{live ? "· live 5s" : "· reconnecting…"}</span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="pixel-press ml-auto border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-0.5 text-[14px] uppercase"
        >
          refresh (r)
        </button>
      </div>

      {note && (
        <p
          role="status"
          className="mb-4 border-[2px] border-[var(--color-purple)] bg-[var(--bg-sunk)] px-3 py-1.5 text-[14px]"
        >
          {note}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Quotas & budgets" anchorRef={quotasRef}>
          {dashboard.quotas.map((m) => (
            <QuotaRow key={m.key} metric={m} />
          ))}
        </Panel>

        <Panel title="System health" anchorRef={healthRef}>
          {dashboard.health.map((m) => (
            <MetricRow key={m.key} metric={m} />
          ))}
        </Panel>

        <Panel title="Business">
          {dashboard.business.map((m) => (
            <MetricRow key={m.key} metric={m} />
          ))}
        </Panel>

        <Panel title="Abuse & security">
          {dashboard.abuse.map((m) => (
            <MetricRow key={m.key} metric={m} />
          ))}
        </Panel>

        <Panel title="Operational">
          {dashboard.ops.map((m) => (
            <MetricRow key={m.key} metric={m} />
          ))}
        </Panel>

        <Panel title="Admin actions">
          <div className="flex flex-col gap-2">
            <KillSwitchButton
              label="Mode 2 (PIN) sharing"
              on={switchState("mode2")}
              busy={busy === "ks-mode2"}
              onToggle={() =>
                void doAction("ks-mode2", async () => {
                  const s = await toggleKillSwitch("mode2", !switchState("mode2"));
                  return `mode 2 ${s.enabled ? "paused" : "resumed"}`;
                })
              }
            />
            <KillSwitchButton
              label="Anonymous links"
              on={switchState("anon_link")}
              busy={busy === "ks-anon"}
              onToggle={() =>
                void doAction("ks-anon", async () => {
                  const s = await toggleKillSwitch("anon_link", !switchState("anon_link"));
                  return `anon link ${s.enabled ? "paused" : "resumed"}`;
                })
              }
            />
            <KillSwitchButton
              label="Maintenance mode"
              on={switchState("maintenance_mode")}
              busy={busy === "ks-maint"}
              onToggle={() =>
                void doAction("ks-maint", async () => {
                  const s = await toggleKillSwitch("maintenance_mode", !switchState("maintenance_mode"));
                  return `maintenance ${s.enabled ? "on" : "off"}`;
                })
              }
            />
            <div className="mt-1 flex flex-wrap gap-2">
              <ActionButton
                icon="reload"
                label="Run purge"
                busy={busy === "purge"}
                onClick={() =>
                  void doAction("purge", async () => {
                    const r = await runPurge();
                    return `purged ${r.deleted}, swept ${r.swept_orphans}`;
                  })
                }
              />
              <ActionButton
                icon="download"
                label="Run backup"
                busy={busy === "backup"}
                onClick={() =>
                  void doAction("backup", async () => {
                    const r = await runBackup();
                    return `backup ${r.key} (${r.size_bytes} B)`;
                  })
                }
              />
              <a
                href="/me/settings"
                className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 text-[14px] uppercase"
              >
                <PixelIcon name="plus" size={14} />
                Invites
              </a>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Recent admin actions (30d)" anchorRef={auditRef}>
        {dashboard.recent_actions.length === 0 ? (
          <p className="py-1 text-[14px] opacity-60">no actions yet</p>
        ) : (
          <div className="mt-1 flex flex-col gap-0.5">
            {dashboard.recent_actions.map((a, i) => (
              <AuditRow key={i} entry={a} />
            ))}
          </div>
        )}
      </Panel>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[14px] opacity-80">
        <span className="uppercase tracking-widest opacity-60">external:</span>
        {EXTERNAL_LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="underline">
            {l.label} ↗
          </a>
        ))}
        <span className="ml-auto opacity-50">keys: g q · g h · g a · r</span>
      </div>
    </div>
  );
}

function applyDelta(prev: Dashboard, changed: Record<string, Metric>): Dashboard {
  const patch = (list: Metric[]) => list.map((m) => changed[m.key] ?? m);
  return {
    ...prev,
    quotas: patch(prev.quotas),
    health: patch(prev.health),
    business: patch(prev.business),
    abuse: patch(prev.abuse),
    ops: patch(prev.ops),
  };
}

function KillSwitchButton({
  label,
  on,
  busy,
  onToggle,
}: {
  label: string;
  on: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      className="pixel-press flex items-center justify-between border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 text-[14px] disabled:opacity-50"
    >
      <span className="flex items-center gap-2">
        <StatusDot status={on ? "alert" : "ok"} />
        {label}
      </span>
      <span className="num uppercase" style={{ color: on ? "var(--color-pink)" : "inherit" }}>
        {busy ? "…" : on ? "paused — resume" : "pause"}
      </span>
    </button>
  );
}

function ActionButton({
  icon,
  label,
  busy,
  onClick,
}: {
  icon: string;
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="pixel-press inline-flex items-center gap-1 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-2 py-1 text-[14px] uppercase disabled:opacity-50"
    >
      <PixelIcon name={icon} size={14} />
      {busy ? "…" : label}
    </button>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const when = new Date(entry.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-baseline gap-2 text-[14px]">
      <span className="num w-32 shrink-0 opacity-60">{when}</span>
      <span className="opacity-90">{entry.action}</span>
      {entry.target_id && <span className="num break-all opacity-60">{entry.target_id}</span>}
    </div>
  );
}
