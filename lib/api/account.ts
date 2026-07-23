// Client for the account-management surface (devices, invites). All calls send
// the session cookie.

import { env } from "@/lib/env";

export interface DeviceSession {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AccountError";
  }
}

export async function listSessions(): Promise<DeviceSession[]> {
  const response = await fetch(`${env.apiBaseUrl}/me/sessions`, { credentials: "include" });
  if (!response.ok) throw new AccountError(`${response.status}`, response.status);
  const body = (await response.json()) as {
    sessions: {
      id: string;
      device_label: string;
      created_at: string;
      last_seen_at: string;
      current: boolean;
    }[];
  };
  return body.sessions.map((s) => ({
    id: s.id,
    deviceLabel: s.device_label,
    createdAt: s.created_at,
    lastSeenAt: s.last_seen_at,
    current: s.current,
  }));
}

/** Sign out one device. A 404 (already gone) is treated as success. */
export async function revokeSession(id: string): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/me/sessions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok && response.status !== 404) {
    throw new AccountError(`${response.status}`, response.status);
  }
}

/** Mint an invite code (admin only). Throws {@link AccountError} 403 otherwise. */
export async function createInvite(): Promise<string> {
  const response = await fetch(`${env.apiBaseUrl}/me/invites`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new AccountError(`${response.status}`, response.status);
  return String(((await response.json()) as { code: string }).code);
}
