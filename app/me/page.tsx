import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ClipsFeed } from "@/components/me/ClipsFeed";

export const metadata: Metadata = {
  title: "My clips",
  description: "Your private, end-to-end encrypted clip history.",
  alternates: { canonical: "/me" },
  robots: { index: false, follow: false },
};

export default function MyClipsPage() {
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-6 md:pt-12 md:pb-8">
          <PixelBadge tone="info">
            <PixelIcon name="bookmark" size={12} />
            your clips · zero-knowledge
          </PixelBadge>
          <h1 className="mt-3 text-[36px] leading-[1] font-[var(--font-display)] tracking-tight md:text-[48px]">
            my <span className="text-[var(--color-purple)]">clips</span>.
          </h1>
          <p className="mt-3 max-w-[560px] text-[16px] font-[var(--font-body)] opacity-80">
            Everything you save is encrypted in your browser. Only this unlocked session can read
            it.
          </p>
        </section>

        <ClipsFeed />
      </main>
      <Footer />
    </>
  );
}
