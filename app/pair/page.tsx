import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PairSender } from "@/components/pair/PairSender";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export const metadata: Metadata = {
  title: "Pair",
  description:
    "Pair two devices live. A short PIN, peer-to-peer, nothing persisted on the server.",
  alternates: { canonical: "/pair" },
  // No social preview; this is a session entry point, not a shareable page.
  robots: { index: false, follow: false },
};

export default function PairPage() {
  return (
    <>
      <Header />

      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-8 md:pt-12 md:pb-10">
          <PixelBadge tone="warn">
            <PixelIcon name="devices" size={12} />
            pair · live · peer-to-peer
          </PixelBadge>
          <h1 className="mt-3 font-[var(--font-display)] text-[36px] leading-[1] tracking-tight md:text-[48px] lg:text-[56px]">
            pair a <span className="text-[var(--color-marigold)]">device</span>.
          </h1>
          <p className="mt-4 w-full font-[var(--font-body)] text-[16px] opacity-90 md:max-w-[58ch] md:text-[18px]">
            Share the PIN on the other side. They&apos;ll join in seconds and
            the two of you will be connected directly, Wispr stays out of the
            payload.
          </p>
        </section>

        <PairSender />
      </main>

      <Footer />
    </>
  );
}
