import { PixelIcon } from "@/components/pixel/PixelIcon";

// Shown on surfaces whose actions need the network. The note explains what's
// gated on the current surface (publishing a share vs. saving a clip).
export function OfflineBanner({ note }: { note: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 border-[2px] border-[var(--color-marigold)] bg-[var(--bg-sunk)] px-3 py-2 text-[14px] font-[var(--font-body)]"
    >
      <PixelIcon name="cellular-signal-off" size={16} />
      <span>
        <span className="font-semibold">You&apos;re offline.</span>{" "}
        <span className="opacity-80">{note}</span>
      </span>
    </p>
  );
}
