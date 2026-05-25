// Client for the pair signaling API surface (POST /pair).
//
// The server returns the PIN + an opaque sender token + an absolute
// expiry timestamp. Idempotency within the 60s waiting window: a repeat
// call from the same sender IP returns the SAME pair (same PIN, same
// token, same expires_at) so the on-screen countdown stays honest.

import { env } from "@/lib/env";

export interface CreatePairResponse {
  pin: string;
  senderToken: string;
  expiresAt: Date;
}

export class CreatePairError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CreatePairError";
  }
}

interface RawCreatePairResponse {
  pin: string;
  sender_token: string;
  expires_at: string;
}

export async function createPair(
  options: { signal?: AbortSignal } = {},
): Promise<CreatePairResponse> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (options.signal) init.signal = options.signal;
  const response = await fetch(`${env.apiBaseUrl}/pair`, init);

  if (!response.ok) {
    const detail = await safeErrorBody(response);
    throw new CreatePairError(
      detail ?? `${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const body = (await response.json()) as RawCreatePairResponse;
  return {
    pin: body.pin,
    senderToken: body.sender_token,
    expiresAt: new Date(body.expires_at),
  };
}

async function safeErrorBody(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    return null;
  } catch {
    return null;
  }
}
