"use client";

import { useEffect } from "react";
import { QUEUE_FLUSHED_EVENT, flushQueue } from "@/lib/sync/flush";

// App-wide flusher: drains the offline Sync queue on load and whenever
// connectivity returns, regardless of which page is open. Broadcasts a
// window event on success so an open feed can refresh. Mounted once in the
// root layout.
export function OfflineSync() {
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!navigator.onLine) return;
      let flushed = 0;
      try {
        flushed = await flushQueue();
      } catch {
        return;
      }
      if (!cancelled && flushed > 0) {
        window.dispatchEvent(new CustomEvent(QUEUE_FLUSHED_EVENT, { detail: { flushed } }));
      }
    }
    void run();
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return null;
}
