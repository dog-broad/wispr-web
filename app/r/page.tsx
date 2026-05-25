import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { Receiver } from "@/components/pair/Receiver";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export const metadata: Metadata = {
  title: "Receive",
  description:
    "Enter a 4-digit PIN to receive content over a live, peer-to-peer pair session.",
  alternates: { canonical: "/r" },
  // Session entry point, not shareable surface.
  robots: { index: false, follow: false },
};

interface ReceivePageProps {
  searchParams: Promise<{ pin?: string }>;
}

export default async function ReceivePage({ searchParams }: ReceivePageProps) {
  const params = await searchParams;
  const initialPin =
    typeof params.pin === "string" ? params.pin.replace(/\D/g, "").slice(0, 4) : undefined;

  return (
    <>
      <Header />

      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-8 md:pt-12 md:pb-10">
          <PixelBadge tone="warn">
            <PixelIcon name="devices" size={12} />
            receive · live pair
          </PixelBadge>
          <h1 className="mt-3 font-[var(--font-display)] text-[36px] leading-[1] tracking-tight md:text-[48px] lg:text-[56px]">
            got a <span className="text-[var(--color-marigold)]">PIN</span>?
          </h1>
          <p className="mt-4 w-full font-[var(--font-body)] text-[16px] opacity-90 md:max-w-[58ch] md:text-[18px]">
            Type the 4 digits from the other side. Pair stays peer-to-peer; the
            server only relays signaling, never your content.
          </p>
        </section>

        <Receiver {...(initialPin ? { initialPin } : {})} />
      </main>

      <Footer />
    </>
  );
}
