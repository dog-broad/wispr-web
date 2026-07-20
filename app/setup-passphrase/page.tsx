import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PassphraseSetup } from "@/components/auth/PassphraseSetup";

export const metadata: Metadata = {
  title: "Set your passphrase",
  robots: { index: false, follow: false },
};

export default function SetupPassphrasePage() {
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-8 md:pt-12 md:pb-10">
          <PixelBadge tone="info">
            <PixelIcon name="lock" size={12} />
            one-time setup · zero-knowledge
          </PixelBadge>
          <h1 className="mt-3 font-[var(--font-display)] text-[36px] leading-[1] tracking-tight md:text-[48px]">
            lock it <span className="text-[var(--color-purple)]">down</span>.
          </h1>
        </section>
        <div className="max-w-[520px]">
          <PassphraseSetup />
        </div>
      </main>
      <Footer />
    </>
  );
}
