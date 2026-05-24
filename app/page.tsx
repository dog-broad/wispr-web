import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTextarea } from "@/components/pixel/PixelInput";
import { PixelPill } from "@/components/pixel/PixelPill";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { WispMascot } from "@/components/pixel/WispMascot";
import {
  ClockIcon,
  EyeIcon,
  LockIcon,
  CommandIcon,
  KeyIcon,
  QrIcon,
  SendIcon,
  PairIcon,
  FloppyIcon,
  EnvelopeIcon,
  SparkleIcon,
} from "@/components/pixel/icons";

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
              <SparkleIcon size={12} />
              <span className="num">v1</span> in flight · <span className="num">M1</span> link-foundation
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
        <section className="relative">
          {/* Wisp peeks above the composer on md+; inline near the CTAs on mobile */}
          <div className="absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
            <WispMascot state="wave" size={3} />
          </div>

          <PixelCard variant="lifted" accent="pink">
            <div className="flex flex-col gap-4">
              <PixelTextarea
                placeholder="Type or paste anything.
text — code — urls — files (up to 25 MB)
Encrypted in your browser before it leaves."
                rows={6}
              />

              <div className="flex flex-wrap gap-2">
                <PixelPill
                  icon={<ClockIcon size={12} />}
                  label="lifetime"
                  value="10 min"
                />
                <PixelPill
                  icon={<EyeIcon size={12} />}
                  label="reads"
                  value="1"
                />
                <PixelPill
                  icon={<LockIcon size={12} />}
                  label="password"
                  value="off"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <PixelButton
                  variant="primary"
                  size="lg"
                  block
                  leading={<KeyIcon size={20} />}
                  trailing={
                    <kbd className="ml-1 inline-flex items-center gap-1 border-2 border-current px-1.5 py-0.5 font-[var(--font-mono)] text-[12px]">
                      <CommandIcon size={12} />↵
                    </kbd>
                  }
                >
                  Get a link
                </PixelButton>
                <PixelButton
                  variant="secondary"
                  size="lg"
                  block
                  leading={<LockIcon size={20} />}
                  disabled
                  title="Sign in to share by PIN"
                >
                  Get a PIN
                </PixelButton>
              </div>

              <p className="flex items-center gap-2 font-[var(--font-body)] text-[14px] opacity-70">
                <span className="md:hidden">
                  <WispMascot state="linking" size={2} animate={false} />
                </span>
                <span>
                  Only the link-holder can read it. Sign in to share by PIN —
                  easier for groups.
                </span>
              </p>
            </div>
          </PixelCard>

          {/* Pair affordance */}
          <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <p className="inline-flex items-center gap-2 font-[var(--font-body)] text-[14px]">
              <PairIcon size={16} />
              Or pair a device live →
            </p>
            <div className="inline-flex items-center gap-2 font-[var(--font-mono)] text-[16px]">
              <span className="opacity-60">Got a PIN?</span>
              <PinSlots />
              <span aria-hidden className="opacity-60">or</span>
              <span className="inline-flex items-center gap-1 opacity-90">
                <QrIcon size={16} /> scan
              </span>
            </div>
          </div>
        </section>

        {/* Mode strip — illustrated */}
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
              icon={<KeyIcon size={28} />}
              title="Link"
              who="anyone"
              note="One-shot URL. Burned after one read. ZK."
            />
            <ModeCard
              accent="purple"
              icon={<LockIcon size={28} />}
              title="PIN"
              who="members"
              note={<><span className="num">4</span> digits. Anyone with the PIN can read it.</>}
            />
            <ModeCard
              accent="marigold"
              icon={<PairIcon size={28} />}
              title="Pair"
              who="anyone"
              note="Device-to-device, live, peer-to-peer. ZK."
            />
            <ModeCard
              accent="moss"
              icon={<FloppyIcon size={28} />}
              title="My clips"
              who="members"
              note="Your own history. Synced across devices. ZK."
            />
          </div>
        </section>

        {/* Decorative illustration row, marquee on md+ */}
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

const marqueeItems = [
  { label: "text", icon: <SendIcon size={20} /> },
  { label: "code", icon: <CommandIcon size={20} /> },
  { label: "links", icon: <KeyIcon size={20} /> },
  { label: "files", icon: <FloppyIcon size={20} /> },
  { label: "QRs", icon: <QrIcon size={20} /> },
  { label: "PINs", icon: <LockIcon size={20} /> },
  { label: "letters", icon: <EnvelopeIcon size={20} /> },
];

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

// Decorative scatter — only renders on md+, sits behind hero text
function DecorScatter() {
  return (
    <div className="relative h-full w-full opacity-70">
      <span className="absolute right-2 top-4 text-[var(--color-marigold)]">
        <SparkleIcon size={20} />
      </span>
      <span className="absolute right-24 top-20 text-[var(--color-purple)]">
        <FloppyIcon size={28} />
      </span>
      <span className="absolute right-12 bottom-2 text-[var(--color-moss)]">
        <EnvelopeIcon size={24} />
      </span>
      <span className="absolute right-40 bottom-10 text-[var(--color-pink)]">
        <HeartLikeStar />
      </span>
    </div>
  );
}

function HeartLikeStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges">
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
