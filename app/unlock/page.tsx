import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PassphrasePrompt } from "@/components/auth/PassphrasePrompt";

export const metadata: Metadata = {
  title: "Unlock",
  robots: { index: false, follow: false },
};

export default function UnlockPage() {
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-8 md:pt-12 md:pb-10">
          <PixelBadge tone="info">
            <PixelIcon name="lock" size={12} />
            this session · zero-knowledge
          </PixelBadge>
          <h1 className="mt-3 text-[36px] leading-[1] font-[var(--font-display)] tracking-tight md:text-[48px]">
            welcome <span className="text-[var(--color-purple)]">back</span>.
          </h1>
        </section>
        <div className="max-w-[520px]">
          <Suspense fallback={null}>
            <PassphrasePrompt />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
