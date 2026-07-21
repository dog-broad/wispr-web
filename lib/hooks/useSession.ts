"use client";

import { useEffect, useState } from "react";
import { getSession, type SessionInfo } from "@/lib/api/auth";

// Client-side auth signal. PIN-share (Mode 2) only needs "am I signed in?" —
// it uses a per-share random content key the server wraps, not the master KEK,
// so an unlocked passphrase isn't required to create one.
export function useSession(): { session: SessionInfo | null; loading: boolean } {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getSession()
      .then((s) => {
        if (active) setSession(s);
      })
      .catch(() => {
        // Treat any failure as signed-out; the UI degrades to link-only.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { session, loading };
}
