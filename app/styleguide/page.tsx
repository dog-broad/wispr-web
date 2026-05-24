import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput, PixelTextarea } from "@/components/pixel/PixelInput";
import { PixelPill } from "@/components/pixel/PixelPill";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { WispMascot, type WispState } from "@/components/pixel/WispMascot";
import { PixelLogo } from "@/components/pixel/PixelLogo";
import { LiveApiBadge } from "@/components/pixel/LiveApiBadge";
import { CryptoSelfTest } from "@/components/pixel/CryptoSelfTest";
import {
  ClockIcon,
  EyeIcon,
  LockIcon,
  KeyIcon,
  QrIcon,
  CopyIcon,
  SendIcon,
  PairIcon,
  FloppyIcon,
  HeartIcon,
  SparkleIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  EnvelopeIcon,
} from "@/components/pixel/icons";

const PALETTE: Array<{ name: string; hex: string; varName: string; role: string }> = [
  { name: "cream", hex: "#f4ecd8", varName: "--color-cream", role: "light surface" },
  { name: "cream-50", hex: "#faf5e6", varName: "--color-cream-50", role: "lifted on cream" },
  { name: "cream-200", hex: "#e6dcc2", varName: "--color-cream-200", role: "sunk on cream" },
  { name: "navy", hex: "#1f1a2e", varName: "--color-navy", role: "dark surface · primary text" },
  { name: "navy-700", hex: "#2d2640", varName: "--color-navy-700", role: "lifted in dark" },
  { name: "navy-900", hex: "#15111f", varName: "--color-navy-900", role: "sunk in dark" },
  { name: "pink", hex: "#ff6188", varName: "--color-pink", role: "primary CTA · accent" },
  { name: "purple", hex: "#8b5fbf", varName: "--color-purple", role: "PIN · links · code" },
  { name: "moss", hex: "#7a9e7e", varName: "--color-moss", role: "success" },
  { name: "marigold", hex: "#f9b572", varName: "--color-marigold", role: "warn · highlight" },
];

const TYPE_SPECIMENS = [
  {
    family: "Silkscreen",
    role: "display · logos · headlines",
    varName: "var(--font-display)",
    samples: [
      { size: 64, text: "Wispr" },
      { size: 32, text: "send anything" },
      { size: 22, text: "GET A LINK" },
    ],
  },
  {
    family: "Pixelify Sans",
    role: "body · UI chrome · buttons",
    varName: "var(--font-body)",
    samples: [
      { size: 22, text: "A clipboard you can trust." },
      { size: 16, text: "Type or paste anything." },
      { size: 14, text: "Encrypted in your browser before it leaves." },
    ],
  },
  {
    family: "VT323",
    role: "mono · PINs · code · IDs",
    varName: "var(--font-mono)",
    samples: [
      { size: 22, text: "PIN 7 3 5 1" },
      { size: 16, text: "k7m2x — id" },
      { size: 14, text: "wispr.rushyendra.dev/s/k7m2x#k=zN2v..." },
    ],
  },
];

const WISP_STATES: WispState[] = [
  "idle",
  "wave",
  "sending",
  "linking",
  "pinning",
  "pairing",
  "success",
  "error",
  "sleeping",
];

export default function StyleguidePage() {
  return (
    <>
      <Header />

      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="pt-6 pb-8 md:pt-10">
          <div className="flex flex-col items-start gap-3">
            <PixelBadge tone="warn">
              <SparkleIcon size={12} />
              internal · noindex · removed before the first ship
            </PixelBadge>
            <h1 className="font-[var(--font-display)] text-[36px] leading-[1] tracking-tight md:text-[48px] lg:text-[56px]">
              <span className="text-[var(--color-purple)]">/</span>styleguide
            </h1>
            <p className="w-full font-[var(--font-body)] text-[16px] opacity-85 md:max-w-[58ch]">
              Visual language reference for Wispr. Lives at <code className="num text-[14px]">/styleguide</code> while the
              first ship cycle is in flight, then decommissions before the merge to <code className="num text-[14px]">main</code>.
              The rules survive in the design tokens (<code className="num text-[14px]">app/globals.css</code>) and the
              primitive components (<code className="num text-[14px]">components/pixel/</code>).
            </p>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2 font-[var(--font-body)] text-[14px]">
            {[
              "live env",
              "crypto",
              "palette",
              "type",
              "logo",
              "wisp",
              "buttons",
              "inputs",
              "cards",
              "badges",
              "illustrations",
              "motion",
              "320 px",
            ].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="pixel-press inline-flex h-9 items-center border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] px-3 shadow-[3px_3px_0_0_var(--border)]"
              >
                #{id}
              </a>
            ))}
          </nav>
        </section>

        {/* Live env */}
        <Section
          id="live env"
          title="live env"
          subtitle="smoke signal — the local stack is wired and CORS lets us through"
        >
          <div className="border-[3px] border-[var(--border)] bg-[var(--bg-lifted)] p-4 shadow-[var(--shadow-pixel)]">
            <LiveApiBadge />
            <p className="mt-3 font-[var(--font-body)] text-[14px] opacity-80">
              Reads <code className="num text-[13px]">NEXT_PUBLIC_API_BASE_URL</code> (default
              {" "}<code className="num text-[13px]">http://localhost:8000</code>) and hits
              {" "}<code className="num text-[13px]">/health</code>. If it stays red, bring up the api with
              {" "}<code className="num text-[13px]">cd ../wispr-api && docker compose up -d</code>.
            </p>
          </div>
        </Section>

        {/* Crypto self-test */}
        <Section
          id="crypto"
          title="crypto"
          subtitle="webcrypto + web worker — generates a key, encrypts, decrypts, asserts the round-trip"
        >
          <div className="border-[3px] border-[var(--border)] bg-[var(--bg-lifted)] p-4 shadow-[var(--shadow-pixel)]">
            <CryptoSelfTest />
            <p className="mt-3 font-[var(--font-body)] text-[14px] opacity-80">
              Runs entirely in the browser via{" "}
              <code className="num text-[13px]">lib/crypto/client.ts</code> →{" "}
              <code className="num text-[13px]">lib/crypto/worker.ts</code>. AES-GCM-256 with a fresh
              12-byte IV per call. Keys never touch the network or any persistent storage.
            </p>
          </div>
        </Section>

        {/* Palette */}
        <Section id="palette" title="palette" subtitle="indie pixel warmth — six core colors + tints">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PALETTE.map((c) => (
              <div
                key={c.name}
                className="border-[3px] border-[var(--border)] shadow-[var(--shadow-pixel-sm)]"
              >
                <div className="h-16 border-b-[3px] border-[var(--border)]" style={{ background: c.hex }} />
                <div className="bg-[var(--bg-lifted)] p-3">
                  <p className="font-[var(--font-display)] text-[14px] tracking-widest uppercase">{c.name}</p>
                  <p className="mt-1 font-[var(--font-mono)] text-[13px] opacity-80">{c.hex}</p>
                  <p className="mt-1 font-[var(--font-body)] text-[12px] opacity-70">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Type */}
        <Section id="type" title="typography" subtitle="three fonts, locked: silkscreen + pixelify sans + vt323">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TYPE_SPECIMENS.map((t) => (
              <PixelCard key={t.family} variant="lifted" accent="pink">
                <p className="font-[var(--font-display)] text-[16px] tracking-widest uppercase">
                  {t.family}
                </p>
                <p className="mt-1 font-[var(--font-body)] text-[13px] opacity-70">{t.role}</p>
                <div className="mt-4 space-y-2">
                  {t.samples.map((s) => (
                    <div
                      key={s.text}
                      style={{ fontFamily: t.varName, fontSize: `${s.size}px`, lineHeight: 1.1 }}
                      className="break-words"
                    >
                      {s.text}
                    </div>
                  ))}
                </div>
              </PixelCard>
            ))}
          </div>
        </Section>

        {/* Logo */}
        <Section id="logo" title="logo" subtitle="silkscreen wordmark with a marigold spark on the “i”">
          <div className="flex flex-wrap items-end gap-8 border-[3px] border-[var(--border)] bg-[var(--bg-lifted)] p-6 shadow-[var(--shadow-pixel)]">
            <PixelLogo size="xl" />
            <PixelLogo size="lg" />
            <PixelLogo size="md" />
            <PixelLogo size="sm" />
          </div>
        </Section>

        {/* Wisp */}
        <Section id="wisp" title="the wisp" subtitle="the mascot. always doing something.">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {WISP_STATES.map((s) => (
              <PixelCard key={s} variant="lifted" className="text-center">
                <div className="flex h-24 items-center justify-center">
                  <WispMascot state={s} size={2} />
                </div>
                <p className="mt-2 font-[var(--font-display)] text-[12px] tracking-widest uppercase">
                  {s}
                </p>
              </PixelCard>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section id="buttons" title="buttons" subtitle="three variants × three sizes · chunky borders · pixel offset shadow">
          <div className="space-y-6">
            <Row label="primary">
              <PixelButton variant="primary" size="sm">Send · sm</PixelButton>
              <PixelButton variant="primary" size="md" leading={<KeyIcon size={16} />}>Get a link · md</PixelButton>
              <PixelButton variant="primary" size="lg" leading={<KeyIcon size={20} />}>Get a link · lg</PixelButton>
            </Row>
            <Row label="secondary">
              <PixelButton variant="secondary" size="sm">PIN · sm</PixelButton>
              <PixelButton variant="secondary" size="md" leading={<LockIcon size={16} />}>Get a PIN · md</PixelButton>
              <PixelButton variant="secondary" size="lg" leading={<LockIcon size={20} />}>Get a PIN · lg</PixelButton>
            </Row>
            <Row label="ghost">
              <PixelButton variant="ghost" size="md">My clips</PixelButton>
              <PixelButton variant="ghost" size="md" leading={<CopyIcon size={16} />}>Copy</PixelButton>
              <PixelButton variant="outline" size="md">Outline</PixelButton>
            </Row>
            <Row label="disabled">
              <PixelButton variant="primary" disabled>Disabled</PixelButton>
              <PixelButton variant="secondary" disabled leading={<LockIcon size={16} />}>Get a PIN</PixelButton>
            </Row>
          </div>
        </Section>

        {/* Inputs */}
        <Section id="inputs" title="inputs · pills" subtitle="composer chrome — pixel borders, color-only focus, no curves">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="font-[var(--font-display)] text-[12px] tracking-widest uppercase">text input</label>
              <PixelInput placeholder="alice@example.com" />
              <label className="mt-4 font-[var(--font-display)] text-[12px] tracking-widest uppercase">textarea</label>
              <PixelTextarea placeholder="Type or paste anything." rows={4} />
            </div>
            <div className="space-y-3">
              <label className="font-[var(--font-display)] text-[12px] tracking-widest uppercase">composer pills</label>
              <div className="flex flex-wrap gap-2">
                <PixelPill icon={<ClockIcon size={12} />} label="lifetime" value="10 min" />
                <PixelPill icon={<ClockIcon size={12} />} label="lifetime" value="1 hr" />
                <PixelPill icon={<EyeIcon size={12} />} label="reads" value="1" />
                <PixelPill icon={<EyeIcon size={12} />} label="reads" value="∞" />
                <PixelPill icon={<LockIcon size={12} />} label="password" value="off" />
              </div>
              <label className="mt-4 font-[var(--font-display)] text-[12px] tracking-widest uppercase">PIN slots</label>
              <span className="inline-flex gap-1">
                {["7", "3", "5", "1"].map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex h-12 w-10 items-center justify-center border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] font-[var(--font-mono)] text-[26px]"
                  >
                    {d}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section id="cards" title="cards" subtitle="default · lifted · sunk · accent-bar variants">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PixelCard variant="default" title="default">
              <p className="font-[var(--font-body)] text-[14px]">Sits on the canvas bg.</p>
            </PixelCard>
            <PixelCard variant="lifted" title="lifted" accent="pink">
              <p className="font-[var(--font-body)] text-[14px]">Lifted from the canvas, with pink accent bar.</p>
            </PixelCard>
            <PixelCard variant="sunk" title="sunk" accent="purple">
              <p className="font-[var(--font-body)] text-[14px]">Sunk into the canvas, purple accent.</p>
            </PixelCard>
            <PixelCard variant="lifted" accent="moss" title="success" footer="resolved 12:42 UTC">
              <p className="font-[var(--font-body)] text-[14px]">Footer is mono-typed, sunk-colored.</p>
            </PixelCard>
            <PixelCard variant="lifted" accent="marigold" title="warn">
              <p className="font-[var(--font-body)] text-[14px]">Approaching a quota cap.</p>
            </PixelCard>
            <PixelCard variant="lifted" accent="pink" title="error">
              <p className="font-[var(--font-body)] text-[14px]">Loud, but not modal. Inline.</p>
            </PixelCard>
          </div>
        </Section>

        {/* Badges */}
        <Section id="badges" title="badges" subtitle="status tones — success, warn, error, info, neutral">
          <div className="flex flex-wrap gap-3">
            <PixelBadge tone="success"><CheckIcon size={12} /> sent</PixelBadge>
            <PixelBadge tone="warn">approaching</PixelBadge>
            <PixelBadge tone="error">over cap</PixelBadge>
            <PixelBadge tone="info">link · v1</PixelBadge>
            <PixelBadge tone="neutral">members only</PixelBadge>
          </div>
        </Section>

        {/* Illustrations */}
        <Section id="illustrations" title="illustrations · icons" subtitle="hand-rolled inline SVG · crisp edges">
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
            {[
              { name: "key", icon: <KeyIcon size={28} />, c: "pink" },
              { name: "lock", icon: <LockIcon size={28} />, c: "purple" },
              { name: "clock", icon: <ClockIcon size={28} />, c: "marigold" },
              { name: "eye", icon: <EyeIcon size={28} />, c: "moss" },
              { name: "QR", icon: <QrIcon size={28} />, c: "navy" },
              { name: "copy", icon: <CopyIcon size={28} />, c: "navy" },
              { name: "send", icon: <SendIcon size={28} />, c: "pink" },
              { name: "pair", icon: <PairIcon size={28} />, c: "purple" },
              { name: "floppy", icon: <FloppyIcon size={28} />, c: "pink" },
              { name: "heart", icon: <HeartIcon size={28} />, c: "pink" },
              { name: "spark", icon: <SparkleIcon size={28} />, c: "marigold" },
              { name: "check", icon: <CheckIcon size={28} />, c: "moss" },
              { name: "chev", icon: <ChevronDownIcon size={28} />, c: "navy" },
              { name: "cmd", icon: <CommandIcon size={28} />, c: "purple" },
              { name: "mail", icon: <EnvelopeIcon size={28} />, c: "moss" },
            ].map((i) => (
              <div
                key={i.name}
                className="flex flex-col items-center justify-center gap-2 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)] p-3"
                style={{ color: `var(--color-${i.c})` }}
              >
                <span>{i.icon}</span>
                <span className="font-[var(--font-mono)] text-[12px] opacity-80" style={{ color: "var(--fg)" }}>
                  {i.name}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Motion */}
        <Section
          id="motion"
          title="motion"
          subtitle="every animation uses steps() · respects prefers-reduced-motion"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PixelCard variant="lifted" title="bob + blink">
              <div className="flex h-28 items-center justify-center">
                <WispMascot state="idle" size={3} />
              </div>
              <p className="mt-2 font-[var(--font-body)] text-[14px] opacity-80">
                steps(4) over 2 s, blink every 4 s
              </p>
            </PixelCard>

            <PixelCard variant="lifted" title="press">
              <div className="flex h-28 items-center justify-center">
                <PixelButton variant="primary" size="md">hover me</PixelButton>
              </div>
              <p className="mt-2 font-[var(--font-body)] text-[14px] opacity-80">
                shadow snaps to 0; element translates to its shadow
              </p>
            </PixelCard>

            <PixelCard variant="lifted" title="drift in">
              <div className="flex h-28 items-center justify-center">
                <div className="anim-drift-in font-[var(--font-display)] text-[32px] text-[var(--color-pink)]">
                  hello
                </div>
              </div>
              <p className="mt-2 font-[var(--font-body)] text-[14px] opacity-80">
                steps(2) over 320 ms · used for section entries
              </p>
            </PixelCard>
          </div>
        </Section>

        {/* 320 px narrow viewport preview */}
        <Section
          id="320 px"
          title="narrow viewport · 320 px"
          subtitle="every page must hold up at 320 px wide · this is the iPhone SE check"
        >
          <div className="overflow-hidden border-[3px] border-[var(--border)] bg-[var(--bg-sunk)] p-3 shadow-[var(--shadow-pixel)]">
            <div
              className="mx-auto border-[2px] border-[var(--color-purple)] bg-[var(--bg)]"
              style={{ width: 320 }}
            >
              <div className="px-3 py-3">
                <div className="flex items-center justify-between">
                  <PixelLogo size="sm" />
                  <span className="inline-block h-8 w-8 border-[2px] border-[var(--border)] bg-[var(--bg-lifted)]" />
                </div>
                <h2 className="mt-4 font-[var(--font-display)] text-[24px] leading-[1.05]">
                  send anything,<br />
                  <span className="text-[var(--color-pink)]">privately.</span>
                </h2>
                <PixelCard variant="lifted" accent="pink" className="mt-3">
                  <PixelTextarea rows={3} placeholder="Type or paste anything." />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PixelPill icon={<ClockIcon size={10} />} label="" value="10m" />
                    <PixelPill icon={<EyeIcon size={10} />} label="" value="1" />
                    <PixelPill icon={<LockIcon size={10} />} label="" value="off" />
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <PixelButton variant="primary" size="md" block leading={<KeyIcon size={16} />}>
                      Get a link
                    </PixelButton>
                    <PixelButton variant="secondary" size="md" block disabled leading={<LockIcon size={16} />}>
                      Get a PIN
                    </PixelButton>
                  </div>
                </PixelCard>
              </div>
            </div>
          </div>
        </Section>

        <Section id="footnote" title="footnote" subtitle="">
          <p className="font-[var(--font-body)] text-[14px] opacity-80">
            This page exists so we can keep the visual language honest while
            we build. It will be removed before <code className="num text-[13px]">link-foundation</code> merges
            to <code className="num text-[13px]">main</code>. The rules survive in the design tokens
            and primitive components — delete this route, the rest of the app stays consistent.
          </p>
        </Section>
      </main>

      <Footer />
    </>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24 md:mt-14">
      <header className="border-b-[3px] border-[var(--border)] pb-3">
        <h2 className="font-[var(--font-display)] text-[22px] leading-[1] tracking-tight md:text-[32px]">
          <span className="text-[var(--color-purple)]">§</span> {title}
        </h2>
        {subtitle && (
          <p className="mt-2 font-[var(--font-body)] text-[14px] opacity-80 md:text-[16px]">{subtitle}</p>
        )}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-[var(--font-display)] text-[12px] tracking-widest uppercase opacity-70">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
