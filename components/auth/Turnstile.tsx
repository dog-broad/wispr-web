"use client";

import { useEffect, useRef } from "react";
import { env } from "@/lib/env";

// Minimal Cloudflare Turnstile integration via explicit render. Renders
// nothing when no site key is configured (local dev) — the caller then submits
// with no token and the API bypasses the check. When a key is present it loads
// the Turnstile script once, renders the widget, and reports the token.

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function ensureScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const siteKey = env.turnstileSiteKey;
    if (!siteKey || !containerRef.current) return;
    const container = containerRef.current;
    let widgetId: string | undefined;
    let cancelled = false;

    void ensureScript().then(() => {
      if (cancelled || !window.turnstile) return;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
    });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!env.turnstileSiteKey) return null;
  return <div ref={containerRef} className="mt-4" aria-hidden="true" />;
}
