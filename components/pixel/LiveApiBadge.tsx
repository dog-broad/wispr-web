"use client";

import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { PixelBadge } from "./PixelBadge";
import { CheckIcon } from "./icons";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up"; ms: number }
  | { kind: "down"; reason: string };

// Pings the configured API /health endpoint on mount, displays the result
// as a pixel badge. Lives on /styleguide as a smoke signal that the local
// stack is wired correctly (env var present, CORS allows the origin, the
// api container is actually up). Failure paths are distinct so the
// operator knows which side to investigate.
export function LiveApiBadge() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    setStatus({ kind: "checking" });

    fetch(`${env.apiBaseUrl}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timeout);
        if (cancelled) return;
        if (!res.ok) {
          setStatus({ kind: "down", reason: `HTTP ${res.status}` });
          return;
        }
        const body = (await res.json()) as { status?: string };
        if (body.status !== "ok") {
          setStatus({ kind: "down", reason: "unexpected payload" });
          return;
        }
        setStatus({ kind: "up", ms: Math.round(performance.now() - start) });
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        if (cancelled) return;
        const reason =
          err instanceof DOMException && err.name === "AbortError"
            ? "timeout"
            : err instanceof TypeError
              ? "unreachable / cors"
              : "error";
        setStatus({ kind: "down", reason });
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-2 font-[var(--font-body)] text-[14px]">
      <span className="opacity-70">api</span>
      <span className="num opacity-90">{env.apiBaseUrl}</span>
      <Pill status={status} />
    </span>
  );
}

function Pill({ status }: { status: Status }) {
  switch (status.kind) {
    case "idle":
    case "checking":
      return <PixelBadge tone="neutral">checking…</PixelBadge>;
    case "up":
      return (
        <PixelBadge tone="success">
          <CheckIcon size={12} />
          <span>up</span>
          <span className="num opacity-70">{status.ms}ms</span>
        </PixelBadge>
      );
    case "down":
      return <PixelBadge tone="error">down — {status.reason}</PixelBadge>;
  }
}
