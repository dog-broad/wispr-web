import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Wispr with a magic link.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-8 md:pt-12 md:pb-10">
          <PixelBadge tone="info">
            <PixelIcon name="mail" size={12} />
            members · magic link · no password
          </PixelBadge>
          <h1 className="mt-3 font-[var(--font-display)] text-[36px] leading-[1] tracking-tight md:text-[48px]">
            welcome <span className="text-[var(--color-pink)]">back</span>.
          </h1>
        </section>

        <div className="max-w-[520px]">
          <LoginForm initialInvite={invite} />
        </div>
      </main>
      <Footer />
    </>
  );
}
