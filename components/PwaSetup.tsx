"use client";

import { useEffect, useState } from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelIcon } from "@/components/pixel/PixelIcon";

// `beforeinstallprompt` isn't in lib.dom — declare the slice we use.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISIT_KEY = "wispr-visits";
const DISMISS_KEY = "wispr-install-dismissed";

// Registers the app-shell service worker (production only, since it fights HMR
// under `next dev`) and shows a one-time install prompt, but only from the second
// visit on, so a first-time visitor isn't nagged before they've used anything.
export function PwaSetup() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing (private mode, unsupported) must never break the
        // page: the app works fine online without the shell cache.
      });
    }

    const visits = Number(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      // Re-read the dismissed flag live: the browser can re-fire this within a
      // session, and a stale closure value would re-nag after a dismiss.
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      if (visits >= 2 && !dismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Wispr"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 border-[3px] border-[var(--color-navy)] bg-[var(--bg-lifted)] p-3 shadow-[4px_4px_0_0_var(--border)] md:inset-x-auto md:right-4 md:left-auto"
    >
      <PixelIcon name="download" size={20} />
      <p className="flex-1 font-[var(--font-body)] text-[14px] text-[var(--fg)]">
        Install Wispr for offline access and a home-screen icon.
      </p>
      <PixelButton size="sm" variant="primary" onClick={install}>
        Install
      </PixelButton>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="pixel-press flex h-8 w-8 shrink-0 items-center justify-center border-[3px] border-[var(--border)] bg-transparent text-[var(--fg)]"
      >
        <PixelIcon name="close" size={16} />
      </button>
    </div>
  );
}
