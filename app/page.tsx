import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { Composer } from "@/components/composer/Composer";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        {/* Hero */}
        <section className="relative pt-6 pb-10 md:pt-12 md:pb-16">
          <div className="pointer-events-none absolute inset-0 z-0 hidden md:block">
            <DecorScatter />
          </div>

          <div className="anim-drift-in relative z-10 flex flex-col items-start gap-4 md:gap-6">
            <PixelBadge tone="info">
              <PixelIcon name="zap" size={12} />
              <span className="num">v1</span> in flight · link-foundation
            </PixelBadge>

            <h1 className="font-[var(--font-display)] text-[40px] leading-[1] tracking-tight md:text-[56px] lg:text-[64px]">
              send anything,
              <br />
              <span className="text-[var(--color-pink)]">privately.</span>
            </h1>

            <p className="w-full font-[var(--font-body)] text-[16px] leading-[1.5] opacity-90 md:max-w-[58ch] md:text-[18px]">
              A web-only zero-knowledge clipboard. Move text, code, and files between
              your devices and to other people. Encrypted in your browser before it
              leaves. Server never sees content or keys.
            </p>
          </div>
        </section>

        {/* Composer */}
        <Composer />

        {/* Pair affordance */}
        <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <p className="inline-flex items-center gap-2 font-[var(--font-body)] text-[14px]">
            <PixelIcon name="devices" size={16} />
            Or pair a device live →
          </p>
          <div className="inline-flex items-center gap-2 font-[var(--font-mono)] text-[16px]">
            <span className="opacity-60">Got a PIN?</span>
            <PinSlots />
            <span aria-hidden className="opacity-60">
              or
            </span>
            <span className="inline-flex items-center gap-1 opacity-90">
              <PixelIcon name="grid" size={16} /> scan
            </span>
          </div>
        </div>

        {/* Mode strip */}
        <section className="mt-12 md:mt-20">
          <h2 className="font-[var(--font-display)] text-[24px] tracking-tight md:text-[32px]">
            four ways to send.
          </h2>
          <p className="mt-2 w-full font-[var(--font-body)] text-[16px] opacity-80 md:max-w-[56ch]">
            Decide at send time. No vendor logos. No mode shaming.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ModeCard
              accent="pink"
              icon={<PixelIcon name="link" size={28} />}
              title="Link"
              who="anyone"
              note="One-shot URL. Burned after one read. ZK."
            />
            <ModeCard
              accent="purple"
              icon={<PixelIcon name="lock" size={28} />}
              title="PIN"
              who="members"
              note={
                <>
                  <span className="num">4</span> digits. Anyone with the PIN can read it.
                </>
              }
            />
            <ModeCard
              accent="marigold"
              icon={<PixelIcon name="devices" size={28} />}
              title="Pair"
              who="anyone"
              note="Device-to-device, live, peer-to-peer. ZK."
            />
            <ModeCard
              accent="moss"
              icon={<PixelIcon name="save" size={28} />}
              title="My clips"
              who="members"
              note="Your own history. Synced across devices. ZK."
            />
          </div>
        </section>

        {/* Decorative illustration row, marquee on md+ — bespoke pixel
            glyphs, not the shared icon set. */}
        <section
          aria-hidden
          className="mt-12 hidden overflow-hidden border-y-[3px] border-[var(--border)] bg-[var(--bg-sunk)] py-4 md:block"
        >
          <div className="anim-marquee flex w-max items-center gap-12">
            {[...marqueeItems, ...marqueeItems].map((it, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 font-[var(--font-display)] text-[16px] tracking-widest uppercase opacity-80"
              >
                <span className="text-[var(--color-pink)]">{it.icon}</span>
                {it.label}
              </span>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

// --- Marquee illustrations (bespoke, 16×16 pixel grid) -------------------
// These live with the page rather than in the icon set on purpose: the
// marquee chrome is brand-load-bearing decoration. Distinct, characterful
// glyphs read better here than the same pixelarticons we use elsewhere.

const marqueeItems = [
  { label: "text", icon: <MarqueeSend /> },
  { label: "code", icon: <MarqueeCode /> },
  { label: "links", icon: <MarqueeChain /> },
  { label: "files", icon: <MarqueeFile /> },
  { label: "QRs", icon: <MarqueeQr /> },
  { label: "PINs", icon: <MarqueeKeypad /> },
  { label: "letters", icon: <MarqueeMail /> },
];

function MarqueeFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden
      className="pixel inline-block align-middle"
    >
      <g fill="currentColor">{children}</g>
    </svg>
  );
}

function MarqueeSend() {
  return (
    <MarqueeFrame>
      <rect x="2" y="3" width="12" height="1" />
      <rect x="3" y="4" width="11" height="1" />
      <rect x="5" y="5" width="9" height="1" />
      <rect x="7" y="6" width="7" height="1" />
      <rect x="9" y="7" width="5" height="1" />
      <rect x="7" y="8" width="2" height="1" />
      <rect x="5" y="9" width="2" height="1" />
      <rect x="3" y="10" width="2" height="1" />
      <rect x="2" y="11" width="2" height="1" />
    </MarqueeFrame>
  );
}

function MarqueeCode() {
  return (
    <MarqueeFrame>
      <rect x="3" y="3" width="3" height="1" />
      <rect x="10" y="3" width="3" height="1" />
      <rect x="2" y="4" width="1" height="3" />
      <rect x="13" y="4" width="1" height="3" />
      <rect x="3" y="6" width="10" height="1" />
      <rect x="5" y="7" width="2" height="2" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="3" y="9" width="10" height="1" />
      <rect x="2" y="9" width="1" height="3" />
      <rect x="13" y="9" width="1" height="3" />
      <rect x="3" y="12" width="3" height="1" />
      <rect x="10" y="12" width="3" height="1" />
    </MarqueeFrame>
  );
}

function MarqueeChain() {
  return (
    <MarqueeFrame>
      <rect x="3" y="5" width="4" height="4" />
      <rect x="4" y="6" width="2" height="2" fill="var(--bg-sunk)" />
      <rect x="7" y="6" width="7" height="2" />
      <rect x="11" y="8" width="1" height="2" />
      <rect x="13" y="8" width="1" height="2" />
    </MarqueeFrame>
  );
}

function MarqueeFile() {
  return (
    <MarqueeFrame>
      <rect x="2" y="2" width="11" height="1" />
      <rect x="13" y="2" width="1" height="11" />
      <rect x="2" y="13" width="12" height="1" />
      <rect x="2" y="2" width="1" height="12" />
      <rect x="4" y="3" width="6" height="3" fill="var(--color-cream)" />
      <rect x="11" y="3" width="1" height="3" fill="var(--color-cream)" />
      <rect x="4" y="8" width="8" height="5" fill="var(--color-cream)" />
      <rect x="5" y="9" width="6" height="1" />
      <rect x="5" y="11" width="6" height="1" />
    </MarqueeFrame>
  );
}

function MarqueeQr() {
  return (
    <MarqueeFrame>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="3" y="3" width="3" height="3" fill="var(--bg-sunk)" />
      <rect x="4" y="4" width="1" height="1" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="10" y="3" width="3" height="3" fill="var(--bg-sunk)" />
      <rect x="11" y="4" width="1" height="1" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="3" y="10" width="3" height="3" fill="var(--bg-sunk)" />
      <rect x="4" y="11" width="1" height="1" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="12" y="9" width="2" height="2" />
      <rect x="9" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </MarqueeFrame>
  );
}

function MarqueeKeypad() {
  return (
    <MarqueeFrame>
      <rect x="5" y="2" width="6" height="1" />
      <rect x="4" y="3" width="1" height="3" />
      <rect x="11" y="3" width="1" height="3" />
      <rect x="3" y="6" width="10" height="7" />
      <rect x="7" y="8" width="2" height="3" fill="var(--bg-sunk)" />
    </MarqueeFrame>
  );
}

function MarqueeMail() {
  return (
    <MarqueeFrame>
      <rect x="2" y="4" width="12" height="1" />
      <rect x="2" y="5" width="1" height="7" />
      <rect x="13" y="5" width="1" height="7" />
      <rect x="2" y="12" width="12" height="1" />
      <rect x="3" y="5" width="2" height="1" />
      <rect x="11" y="5" width="2" height="1" />
      <rect x="4" y="6" width="2" height="1" />
      <rect x="10" y="6" width="2" height="1" />
      <rect x="5" y="7" width="2" height="1" />
      <rect x="9" y="7" width="2" height="1" />
      <rect x="7" y="8" width="2" height="1" />
    </MarqueeFrame>
  );
}

function PinSlots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="inline-flex h-9 w-7 items-center justify-center border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] font-[var(--font-mono)] text-[18px]"
        >
          _
        </span>
      ))}
    </span>
  );
}

function ModeCard({
  accent,
  icon,
  title,
  who,
  note,
}: {
  accent: "pink" | "purple" | "marigold" | "moss";
  icon: React.ReactNode;
  title: string;
  who: string;
  note: React.ReactNode;
}) {
  return (
    <PixelCard variant="default" accent={accent} className="h-full">
      <div className="flex flex-col gap-3">
        <div
          className="inline-flex h-12 w-12 items-center justify-center border-[2px] border-[var(--border)] bg-[var(--bg-lifted)]"
          style={{ color: `var(--color-${accent})` }}
        >
          {icon}
        </div>
        <div className="font-[var(--font-display)] text-[20px] tracking-tight">{title}</div>
        <PixelBadge tone="neutral">{who}</PixelBadge>
        <p className="font-[var(--font-body)] text-[14px] opacity-85">{note}</p>
      </div>
    </PixelCard>
  );
}

// Decorative scatter — only renders on md+, sits behind hero text. Uses
// PixelIcon for the recognizable pictograms and one bespoke star for the
// brand accent.
function DecorScatter() {
  return (
    <div className="relative h-full w-full opacity-70">
      <span className="absolute right-2 top-4 text-[var(--color-marigold)]">
        <PixelIcon name="zap" size={20} />
      </span>
      <span className="absolute right-24 top-20 text-[var(--color-purple)]">
        <PixelIcon name="save" size={28} />
      </span>
      <span className="absolute right-12 bottom-2 text-[var(--color-moss)]">
        <PixelIcon name="mail" size={24} />
      </span>
      <span className="absolute right-40 bottom-10 text-[var(--color-pink)]">
        <BrandStar />
      </span>
      <span className="absolute right-64 top-32 text-[var(--color-pink)]">
        <PixelIcon name="clock" size={18} />
      </span>
      <span className="absolute right-2 bottom-32 text-[var(--color-marigold)]">
        <PixelIcon name="eye" size={20} />
      </span>
      <span className="absolute right-80 bottom-4 text-[var(--color-moss)]">
        <PixelIcon name="heart" size={16} />
      </span>
    </div>
  );
}

function BrandStar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden
      className="pixel inline-block align-middle"
    >
      <g fill="currentColor">
        <rect x="7" y="0" width="2" height="2" />
        <rect x="6" y="2" width="4" height="2" />
        <rect x="0" y="7" width="2" height="2" />
        <rect x="14" y="7" width="2" height="2" />
        <rect x="2" y="6" width="2" height="4" />
        <rect x="12" y="6" width="2" height="4" />
        <rect x="7" y="14" width="2" height="2" />
        <rect x="6" y="12" width="4" height="2" />
        <rect x="4" y="4" width="8" height="8" />
      </g>
    </svg>
  );
}
