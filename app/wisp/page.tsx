import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { WispMascot, type WispState } from "@/components/pixel/WispMascot";

// Internal mascot review page. Not linked from any user-facing route —
// referenced by URL only during iteration on the Wisp's art. Indexers
// are explicitly told to skip it.
export const metadata: Metadata = {
  title: "Wisp",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

const STATES: { state: WispState; label: string; note: string }[] = [
  { state: "idle", label: "idle", note: "neutral, blinking" },
  { state: "wave", label: "wave", note: "hi! hand raised, motion sparks" },
  { state: "sending", label: "sending", note: "carries a paper plane + thrust flash" },
  { state: "linking", label: "linking", note: "carries a pink key" },
  { state: "pinning", label: "pinning", note: "carries a purple 4-pip ticket" },
  { state: "pairing", label: "pairing", note: "antenna with broadcast signal arcs" },
  { state: "success", label: "success", note: "moss eyes, smile" },
  { state: "error", label: "error", note: "pink eyes, frown" },
  { state: "sleeping", label: "sleeping", note: "closed crescents + Zzz plume" },
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
                      width: 192,
                      height: 192,
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
              <li><strong>Dome cap:</strong> rows 1–5, cream widens from 6 to 14 px.</li>
              <li><strong>Chest:</strong> rows 6–13, full 14-wide trunk.</li>
              <li><strong>Underbelly:</strong> rows 14–16 taper 12 → 10 → 6.</li>
              <li><strong>Wisp-tail:</strong> rows 17–20, narrows 4 → 1 and curls right.</li>
              <li><strong>Eyes:</strong> 2×2 irises at (8,8) and (14,8) with white sparkle and tinted drop-shadow.</li>
              <li><strong>Blush:</strong> 1 px at (6,10) and (17,10), soft halo at row 11.</li>
              <li><strong>Forehead shine:</strong> two soft creams just inside the dome.</li>
              <li><strong>Hand:</strong> accessory anchor at cols 17–23, rows 9–15.</li>
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
