// Client for the operator console: fetch the dashboard, stream live deltas over
// /ws/admin, and drive the admin actions. All calls send the session cookie.

import { env } from "@/lib/env";

export type MetricStatus = "ok" | "warn" | "alert" | "unknown";

export interface Metric {
  key: string;
  label: string;
  status: MetricStatus;
  value: string | null;
  detail: string | null;
  used?: number | null;
  total?: number | null;
}

export interface AuditEntry {
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
}

export interface Dashboard {
  generated_at: string;
  status: MetricStatus;
  quotas: Metric[];
  health: Metric[];
  business: Metric[];
  abuse: Metric[];
  ops: Metric[];
  recent_actions: AuditEntry[];
}

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, { credentials: "include", ...init });
  if (!response.ok) throw new AdminError(`${path} ${response.status}`, response.status);
  return response.json() as Promise<T>;
}

export function getDashboard(): Promise<Dashboard> {
  return api<Dashboard>("/me/admin/dashboard");
}

// --- live feed ---------------------------------------------------------------

export interface DeltaMessage {
  status: MetricStatus;
  metrics?: Record<string, Metric>;
  recent_actions?: AuditEntry[];
}

export interface AdminFeedHandlers {
  onSnapshot: (dashboard: Dashboard) => void;
  onDelta: (delta: DeltaMessage) => void;
  onStatus?: (status: "open" | "closed") => void;
}

/** Open the live dashboard feed. Returns a disposer that closes the socket. */
export function openAdminFeed(handlers: AdminFeedHandlers): () => void {
  const ws = new WebSocket(`${env.apiWsBaseUrl}/ws/admin`);
  ws.addEventListener("open", () => handlers.onStatus?.("open"));
  ws.addEventListener("close", () => handlers.onStatus?.("closed"));
  ws.addEventListener("message", (event) => {
    let msg: unknown;
    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (typeof msg !== "object" || msg === null) return;
    const m = msg as Record<string, unknown>;
    if (m.op === "snapshot" && m.dashboard) {
      handlers.onSnapshot(m.dashboard as Dashboard);
    } else if (m.op === "delta") {
      handlers.onDelta(m as unknown as DeltaMessage);
    }
  });
  return () => {
    ws.close();
  };
}

// --- actions -----------------------------------------------------------------

export interface KillSwitchState {
  name: string;
  enabled: boolean;
  message: string | null;
}

export function toggleKillSwitch(
  name: string,
  enabled: boolean,
  message?: string,
): Promise<KillSwitchState> {
  return api<KillSwitchState>(`/me/admin/kill-switch/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, message: message ?? null }),
  });
}

export function runPurge(): Promise<{ deleted: number; swept_orphans: number }> {
  return api("/me/admin/actions/purge", { method: "POST" });
}

export function runBackup(): Promise<{ key: string; size_bytes: number }> {
  return api("/me/admin/actions/backup", { method: "POST" });
}

export function setThreshold(
  metric: string,
  warnPct: number,
  alertPct: number,
): Promise<{ metric: string; warn_pct: number; alert_pct: number }> {
  return api(`/me/admin/thresholds/${metric}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ warn_pct: warnPct, alert_pct: alertPct }),
  });
}

export interface BroadcastResult {
  preview: boolean;
  recipient_count: number;
  subject: string;
  sent: number;
}

async function broadcast(body: Record<string, unknown>): Promise<BroadcastResult> {
  const response = await fetch(`${env.apiBaseUrl}/me/admin/actions/broadcast-email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 423) {
    throw new AdminError("wrong_passphrase", response.status);
  }
  if (!response.ok) throw new AdminError(`broadcast ${response.status}`, response.status);
  return response.json() as Promise<BroadcastResult>;
}

/** Preview a broadcast: returns the recipient count, sends nothing. */
export function previewBroadcast(subject: string, body: string): Promise<BroadcastResult> {
  return broadcast({ subject, body, confirm: false });
}

/** Send a broadcast after re-auth. ``authTokenB64`` is the current passphrase's
 *  derived auth token, base64-encoded. */
export function sendBroadcast(
  subject: string,
  body: string,
  authTokenB64: string,
): Promise<BroadcastResult> {
  return broadcast({ subject, body, confirm: true, current_auth_token: authTokenB64 });
}
