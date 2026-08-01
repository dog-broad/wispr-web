"use client";

import { useEffect, useState } from "react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { fetchMaintenance, type MaintenanceState } from "@/lib/api/maintenance";

// Site-wide banner shown when the operator has flipped the maintenance kill
// switch. Renders nothing otherwise, so it's cheap to mount app-wide.
export function MaintenanceBanner() {
  const [state, setState] = useState<MaintenanceState | null>(null);

  useEffect(() => {
    let active = true;
    void fetchMaintenance().then((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!state?.enabled) return null;
  const message = state.message?.trim() || "Wispr is under maintenance. Some actions may be paused.";

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b-[3px] border-[var(--color-navy)] bg-[var(--color-marigold)] px-4 py-2 text-center font-[var(--font-body)] text-[14px] font-semibold text-[var(--color-navy)]"
    >
      <PixelIcon name="alert" size={16} />
      <span>{message}</span>
    </div>
  );
}
