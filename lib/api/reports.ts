// Client for the public takedown-report endpoint. A receiver on a Mode 2 (PIN)
// share can flag it for operator review. Credentials are included so a
// signed-in reporter is recorded; anonymous receivers simply send no cookie.

import { env } from "@/lib/env";

export type ReportReasonCategory = "spam" | "malware" | "illegal" | "harassment" | "other";

// Every distinct /reports outcome as a tagged union so the UI renders each with
// dedicated copy — no generic fall-through.
export type ReportResult =
  | { kind: "ok" }
  | { kind: "turnstile_required" }
  | { kind: "turnstile_failed" }
  | { kind: "rate_limited" }
  | { kind: "unknown_snippet" }
  | { kind: "error" };

export async function submitReport(
  snippetId: string,
  reasonCategory: ReportReasonCategory,
  opts: { reasonText?: string; turnstileToken?: string } = {},
): Promise<ReportResult> {
  const detail = opts.reasonText?.trim();
  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/reports`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snippet_id: snippetId,
        reason_category: reasonCategory,
        reason_text: detail ? detail : null,
        turnstile_token: opts.turnstileToken ?? null,
      }),
    });
  } catch {
    return { kind: "error" };
  }

  if (response.status === 201) return { kind: "ok" };
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 403) return { kind: "turnstile_required" };
  if (response.status === 400 && body.reason === "turnstile_failed") {
    return { kind: "turnstile_failed" };
  }
  if (response.status === 429) return { kind: "rate_limited" };
  if (response.status === 404) return { kind: "unknown_snippet" };
  return { kind: "error" };
}
