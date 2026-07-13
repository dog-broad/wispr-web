import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { VerifyConsumer } from "@/components/auth/VerifyConsumer";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-10 md:pt-16">
          <div className="max-w-[520px]">
            {/* useSearchParams requires a Suspense boundary during prerender. */}
            <Suspense fallback={null}>
              <VerifyConsumer />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
