import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { WispMascot } from "@/components/pixel/WispMascot";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export const metadata: Metadata = {
  // The root layout's title template appends " — Wispr"; declare just
  // the section here so it doesn't double up.
  title: "About",
  description:
    "How Wispr works, the four modes, the security model. Plain language, no jargon.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — Wispr",
    description:
      "How Wispr works, the four modes (Link, PIN, Pair, My clips), and the security model in plain language.",
    url: "https://wispr.rushyendra.dev/about",
  },
  twitter: {
    title: "About — Wispr",
    description: "How Wispr works, in plain language.",
  },
};

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-10 md:pt-12 md:pb-14">
          <PixelBadge tone="info">about</PixelBadge>
          <h1 className="mt-3 font-[var(--font-display)] text-[36px] leading-[1] tracking-tight md:text-[48px] lg:text-[56px]">
            a clipboard you can <span className="text-[var(--color-pink)]">trust</span>.
          </h1>
          <p className="mt-4 w-full font-[var(--font-body)] text-[16px] opacity-90 md:max-w-[58ch] md:text-[18px]">
            Wispr moves text, code, and files between your devices and to other
            people — encrypted in your browser before it leaves. The server only
            sees ciphertext for Link, Pair, and My clips. PIN is the one
            explicit non-ZK mode, and it&rsquo;s gated to members.
          </p>
        </section>

        <section className="mt-2 grid grid-cols-1 gap-6 md:mt-6 md:grid-cols-2">
          <PixelCard
            variant="lifted"
            accent="pink"
            title="how it works"
          >
            <ol className="ml-4 list-decimal space-y-2 font-[var(--font-body)] text-[16px] leading-relaxed marker:text-[var(--color-pink)]">
              <li>You paste. Your browser generates a fresh key.</li>
              <li>The key encrypts your content right in the tab.</li>
              <li>The ciphertext goes to the server. The key does not.</li>
              <li>You hand the key to the receiver (URL fragment, PIN, or live channel).</li>
              <li>The receiver decrypts in their tab. Server stays blind.</li>
            </ol>
          </PixelCard>

          <PixelCard variant="lifted" accent="purple" title="four modes">
            <ul className="space-y-3 font-[var(--font-body)] text-[16px]">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--color-pink)]"><PixelIcon name="link" size={18} /></span>
                <span><strong>Link</strong> — one-shot URL, burned after a read. Anyone can make one.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--color-purple)]"><PixelIcon name="lock" size={18} /></span>
                <span><strong>PIN</strong> — 4 digits. Members only. Convenient. Not zero-knowledge.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--color-marigold)]"><PixelIcon name="devices" size={18} /></span>
                <span><strong>Pair</strong> — two devices, live, peer-to-peer. Nothing persisted.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--color-moss)]"><PixelIcon name="save" size={18} /></span>
                <span><strong>My clips</strong> — your own history. Members only. Zero-knowledge.</span>
              </li>
            </ul>
          </PixelCard>
        </section>

        <section id="security" className="mt-12 md:mt-16">
          <h2 className="font-[var(--font-display)] text-[24px] tracking-tight md:text-[32px]">
            the security model, in plain English.
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PixelCard variant="default">
              <div className="font-[var(--font-display)] text-[16px] tracking-widest uppercase text-[var(--color-pink)]">
                in scope
              </div>
              <ul className="mt-3 space-y-2 font-[var(--font-body)] text-[14px]">
                <li>A snooping operator can&rsquo;t read your content for Link, Pair, or My clips.</li>
                <li>A DB leak is useless without the keys (Links/Pair/My clips).</li>
                <li>Short-PIN brute force is rate-limited and self-invalidating.</li>
              </ul>
            </PixelCard>
            <PixelCard variant="default">
              <div className="font-[var(--font-display)] text-[16px] tracking-widest uppercase text-[var(--color-purple)]">
                out of scope
              </div>
              <ul className="mt-3 space-y-2 font-[var(--font-body)] text-[14px]">
                <li>If your browser is owned, you&rsquo;re owned.</li>
                <li>A malicious extension can read the DOM. We can&rsquo;t stop that.</li>
                <li>If you forget your passphrase, your My clips history is gone. By design.</li>
              </ul>
            </PixelCard>
          </div>
        </section>

        <section id="sign-in" className="mt-12 md:mt-16">
          <PixelCard variant="lifted" accent="moss">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 font-[var(--font-display)] text-[20px] tracking-tight">
                  <PixelIcon name="zap" size={18} />
                  invite-only, for v1
                </p>
                <p className="mt-2 w-full font-[var(--font-body)] text-[14px] opacity-85 md:max-w-[52ch]">
                  Accounts unlock PIN and My clips. Sign-up is by invite while we
                  shake out the build. Anonymous Link and Pair stay free forever.
                </p>
              </div>
              <div className="hidden md:block">
                <WispMascot state="success" size={3} />
              </div>
            </div>
          </PixelCard>
        </section>
      </main>

      <Footer />
    </>
  );
}
