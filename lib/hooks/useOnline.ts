"use client";

import { useEffect, useState } from "react";

// Tracks browser connectivity. Starts optimistic (true) so SSR and first paint
// don't flash an offline state, then corrects on mount from navigator.onLine.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
