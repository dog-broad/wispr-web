import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { WispMascot, type WispState } from "@/components/pixel/WispMascot";

// Internal mascot review page. Not linked from any user-facing route;
// referenced by URL only during iteration on the Wisp's art. Indexers
// are explicitly told to skip it.
export const metadata: Metadata = {
  title: "Wisp",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

const STATES: { state: WispState; label: string; note: string }[] = [
  { state: "idle", label: "idle", note: "sparkle eyes, blink + sparkle drift" },
  { state: "wave", label: "wave", note: "^_^ grin, four sparkle motes twinkling" },
  { state: "sending", label: "sending", note: "envelope + three-stage marigold streaming trail" },
  { state: "linking", label: "linking", note: "interlocked pink chain links rocking" },
  { state: "pinning", label: "pinning", note: "purple ticket, three pips brightening in turn" },
  { state: "pairing", label: "pairing", note: "moss broadcast arcs rippling outward" },
  { state: "success", label: "success", note: "pink heart eyes, soft smile" },
  { state: "error", label: "error", note: "X eyes, small worried o-mouth" },
  { state: "sleeping", label: "sleeping", note: "closed slits + tiered Zzz plume" },
];

const SIZE_VARIANTS = [2, 3, 4, 5, 6];

export default function WispPreviewPage() {
  return (
    <>
      <Header />

      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="pt-6 pb-8 md:pt-10">
          <PixelBadge tone="info">internal · noindex</PixelBadge>
          <h1 className="mt-3 font-[var(--font-display)] text-[32px] leading-[1] tracking-tight md:text-[48px]">
            the wisp · review board
          </h1>
          <p className="mt-3 w-full font-[var(--font-body)] text-[14px] opacity-80 md:max-w-[58ch] md:text-[16px]">
            Every state, every size, on cream and on navy. Use this page to
            spot anything that looks off in the silhouette, the tail, the eyes,
            or any held accessory. Pixel grid overlay below makes alignment
            easy to eyeball.
          </p>
        </section>

        {/* States × backgrounds */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <PixelCard variant="default" title="on cream (light)">
            <div
              className="grid grid-cols-3 gap-4 bg-[var(--color-cream)] p-4 sm:grid-cols-3"
              data-theme="light"
              style={{ color: "var(--color-navy)" }}
            >
              {STATES.map(({ state, label, note }) => (
                <Tile key={state} state={state} label={label} note={note} />
              ))}
            </div>
          </PixelCard>

          <PixelCard variant="default" title="on navy (dark)">
            <div
              className="grid grid-cols-3 gap-4 bg-[var(--color-navy)] p-4 sm:grid-cols-3"
              data-theme="dark"
              style={{ color: "var(--color-cream)" }}
            >
              {STATES.map(({ state, label, note }) => (
                <Tile key={state} state={state} label={label} note={note} dark />
              ))}
            </div>
          </PixelCard>
        </section>

        {/* Size ladder */}
        <section className="mt-10">
          <h2 className="font-[var(--font-display)] text-[20px] tracking-tight md:text-[24px]">
            size ladder
          </h2>
          <p className="mt-1 font-[var(--font-body)] text-[14px] opacity-70">
            Same `idle` state at increasing scale. Size 2 is the mobile inline
            chip; 3 is the corner-float at md+; 4 is composer-card hero. 5 and
            6 are stress-tests for very large headers.
          </p>
          <PixelCard variant="default" className="mt-4">
            <div className="flex flex-wrap items-end gap-6 p-4">
              {SIZE_VARIANTS.map((s) => (
                <figure key={s} className="flex flex-col items-center gap-2">
                  <WispMascot state="idle" size={s} animate={false} />
                  <figcaption className="num font-[var(--font-mono)] text-[14px] opacity-80">
                    size {s}
                  </figcaption>
                </figure>
              ))}
            </div>
          </PixelCard>
        </section>

        {/* Grid overlay (helps spot misaligned pixels) */}
        <section className="mt-10">
          <h2 className="font-[var(--font-display)] text-[20px] tracking-tight md:text-[24px]">
            with pixel grid overlay
          </h2>
          <p className="mt-1 font-[var(--font-body)] text-[14px] opacity-70">
            One pixel of viewBox = 8 screen pixels. Each gridline corresponds
            to a viewBox unit. Use this view to sanity-check silhouette
            symmetry and accessory anchoring.
          </p>
          <PixelCard variant="default" className="mt-4">
            <div className="flex flex-wrap gap-8 p-4">
              {STATES.map(({ state, label }) => (
                <figure key={state} className="relative">
                  <div
                    className="relative"
                    style={{
                      width: 256,
                      height: 256,
                      backgroundImage: `
                        repeating-linear-gradient(0deg, transparent 0 8px, color-mix(in srgb, var(--color-pink) 25%, transparent) 8px 9px),
                        repeating-linear-gradient(90deg, transparent 0 8px, color-mix(in srgb, var(--color-pink) 25%, transparent) 8px 9px)
                      `,
                    }}
                  >
                    <div className="absolute inset-0">
                      <WispMascot state={state} size={8} animate={false} />
                    </div>
                  </div>
                  <figcaption className="mt-2 text-center font-[var(--font-mono)] text-[12px] opacity-80">
                    {label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </PixelCard>
        </section>

        {/* Anatomy callouts */}
        <section className="mt-10">
          <h2 className="font-[var(--font-display)] text-[20px] tracking-tight md:text-[24px]">
            anatomy
          </h2>
          <PixelCard variant="default" className="mt-4">
            <ul className="grid grid-cols-1 gap-2 p-4 font-[var(--font-body)] text-[14px] sm:grid-cols-2">
              <li><strong>Canvas:</strong> 32×32 viewBox, scale 8 = one grid square per pixel.</li>
              <li><strong>Silhouette:</strong> oval sheet-ghost — narrow 6-wide top cap, dome widens 6 → 24 (rows 1–7), body bulges to 26 through the belly (rows 9–17), un-bulges to 24, then tapers 22 → 20 before the scallops. The widest point is the belly, not the head.</li>
              <li><strong>Eyes (idle):</strong> 5×5 navy irises at (7,8) and (20,8) with a single 2×2 white sparkle upper-left. Sparkles drift on a 5 s loop.</li>
              <li><strong>Eye expressions:</strong> X eyes on error, pink hearts on success, ^_^ closed curves on wave, narrow horizontal slits on sleeping.</li>
              <li><strong>Blush:</strong> 2×2 pink ovals at (4,11) and (26,11) with a brighter centre pixel.</li>
              <li><strong>Mouth:</strong> rows 14–16, state-dependent (w-smile default, open o for error, tiered for sleep, wide grin for wave).</li>
              <li><strong>Skirt:</strong> three 4-wide cream humps at row 23 with navy valley fills between them and flat caps at row 24 — humps protrude 1 px past the valley line.</li>
              <li><strong>Accessory zone:</strong> cols 0–31, rows 0–22 — envelope streams marigold trail, link rocks, pin pips cycle, pair arcs ripple, wave sparkle motes twinkle in turn.</li>
              <li><strong>Blink:</strong> 4 s loop, 3 frames (open → half-lid → closed → half-lid → open).</li>
            </ul>
          </PixelCard>
        </section>
      </main>

      <Footer />
    </>
  );
}

function Tile({
  state,
  label,
  note,
  dark = false,
}: {
  state: WispState;
  label: string;
  note: string;
  dark?: boolean;
}) {
  return (
    <figure
      className="flex flex-col items-center gap-2 border-[2px] p-3"
      style={{
        borderColor: dark ? "var(--color-cream)" : "var(--color-navy)",
        background: dark ? "var(--color-navy-700)" : "var(--color-cream-50)",
      }}
    >
      <WispMascot state={state} size={3} />
      <figcaption className="text-center font-[var(--font-mono)] text-[12px] leading-tight">
        <div className="font-[var(--font-display)] text-[14px] tracking-wider uppercase">
          {label}
        </div>
        <div className="opacity-70">{note}</div>
      </figcaption>
    </figure>
  );
}
