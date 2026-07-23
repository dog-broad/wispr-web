"use client";

import { useCallback, useState } from "react";
import { Turnstile } from "@/components/auth/Turnstile";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelSelectPill } from "@/components/pixel/PixelSelectPill";
import { submitReport, type ReportReasonCategory } from "@/lib/api/reports";

// Reason categories mirror the server enum; labels are the user-facing copy.
const REASONS: ReadonlyArray<{ value: ReportReasonCategory; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "malware", label: "Malware or scam" },
  { value: "illegal", label: "Illegal content" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Something else" },
];

const DETAIL_MAX = 1024;

type Status =
  | { kind: "collapsed" }
  | { kind: "form"; submitting: boolean; error: string | null }
  | { kind: "turnstile"; failed: boolean }
  | { kind: "done" };

// The report affordance for a PIN-share receive: a flag button that expands
// into a reason picker + optional detail, then posts to the takedown endpoint.
// Handles the "Turnstile required after repeated reports" branch inline.
export function ReportControl({ snippetId }: { snippetId: string }) {
  const [status, setStatus] = useState<Status>({ kind: "collapsed" });
  const [reason, setReason] = useState<ReportReasonCategory>("spam");
  const [detail, setDetail] = useState("");

  const send = useCallback(
    async (turnstileToken?: string) => {
      setStatus({ kind: "form", submitting: true, error: null });
      const result = await submitReport(snippetId, reason, {
        reasonText: detail,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      switch (result.kind) {
        case "ok":
          setStatus({ kind: "done" });
          return;
        case "turnstile_required":
          setStatus({ kind: "turnstile", failed: false });
          return;
        case "turnstile_failed":
          setStatus({ kind: "turnstile", failed: true });
          return;
        case "rate_limited":
          setStatus({
            kind: "form",
            submitting: false,
            error: "You've sent a lot of reports. Try again later.",
          });
          return;
        case "unknown_snippet":
          setStatus({
            kind: "form",
            submitting: false,
            error: "This share is no longer available to report.",
          });
          return;
        case "error":
          setStatus({
            kind: "form",
            submitting: false,
            error: "Couldn't send that report. Try again.",
          });
      }
    },
    [snippetId, reason, detail],
  );

  const onToken = useCallback(
    (token: string) => {
      if (token) void send(token);
    },
    [send],
  );

  if (status.kind === "done") {
    return (
      <p className="inline-flex items-center gap-2 font-[var(--font-body)] text-[14px] text-[var(--color-moss)]">
        <PixelIcon name="check" size={14} />
        Thanks — reported. The operator will take a look.
      </p>
    );
  }

  if (status.kind === "collapsed") {
    return (
      <PixelButton
        variant="outline"
        size="sm"
        leading={<PixelIcon name="flag" size={14} />}
        onClick={() => setStatus({ kind: "form", submitting: false, error: null })}
      >
        Report
      </PixelButton>
    );
  }

  const submitting = status.kind === "form" && status.submitting;

  return (
    <div className="flex w-full flex-col gap-3 border-[2px] border-[var(--border)] bg-[var(--bg-sunk)] p-3">
      <div className="flex items-center gap-2 font-[var(--font-body)] text-[14px] font-semibold">
        <PixelIcon name="flag" size={14} />
        Report this share
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PixelSelectPill
          label="reason"
          value={reason}
          options={REASONS}
          onChange={setReason}
        />
      </div>

      <textarea
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        maxLength={DETAIL_MAX}
        rows={2}
        placeholder="Add detail (optional)"
        disabled={submitting}
        className="w-full resize-y border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-3 py-2 font-[var(--font-body)] text-[14px] focus:border-[var(--color-pink)] focus:outline-none"
        aria-label="Report detail"
      />

      {status.kind === "turnstile" && (
        <div>
          <p className="font-[var(--font-body)] text-[14px] opacity-90">
            {status.failed
              ? "Couldn't verify you're human — try again."
              : "Confirm you're human to send this report."}
          </p>
          <Turnstile onToken={onToken} />
        </div>
      )}

      {status.kind === "form" && status.error && (
        <p className="font-[var(--font-body)] text-[14px] text-[var(--color-pink)]">
          {status.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status.kind === "form" && (
          <PixelButton
            variant="primary"
            size="sm"
            leading={<PixelIcon name="flag" size={14} />}
            disabled={submitting}
            onClick={() => void send()}
          >
            {submitting ? "Sending…" : "Send report"}
          </PixelButton>
        )}
        <PixelButton
          variant="ghost"
          size="sm"
          disabled={submitting}
          onClick={() => setStatus({ kind: "collapsed" })}
        >
          Cancel
        </PixelButton>
      </div>
    </div>
  );
}
