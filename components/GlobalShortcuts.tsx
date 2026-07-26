"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// App-wide keyboard shortcuts. Cmd/Ctrl+M jumps to My clips from anywhere —
// the one navigation shortcut Wispr commits to, so it's worth a global
// listener rather than per-page wiring.
export function GlobalShortcuts() {
  const router = useRouter();
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        router.push("/me");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  return null;
}
