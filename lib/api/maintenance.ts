// Public maintenance-mode state, read to decide whether to show the site-wide
// banner. Fails closed (no banner) when the API is unreachable: a down API is
// its own signal, and a stale "maintenance" banner would mislead.

import { env } from "@/lib/env";

export interface MaintenanceState {
  enabled: boolean;
  message: string | null;
}

export async function fetchMaintenance(): Promise<MaintenanceState> {
  try {
    const response = await fetch(`${env.apiBaseUrl}/maintenance`);
    if (!response.ok) return { enabled: false, message: null };
    const body = (await response.json()) as { enabled?: boolean; message?: string | null };
    return { enabled: Boolean(body.enabled), message: body.message ?? null };
  } catch {
    return { enabled: false, message: null };
  }
}
