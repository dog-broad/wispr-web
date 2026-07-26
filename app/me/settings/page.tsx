import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { Settings } from "@/components/me/Settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Wispr account, devices, and invites.",
  alternates: { canonical: "/me/settings" },
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6 lg:px-10">
        <section className="anim-drift-in pt-6 pb-6 md:pt-12 md:pb-8">
          <PixelBadge tone="info">
            <PixelIcon name="sliders" size={12} />
            account · devices · invites
          </PixelBadge>
          <h1 className="mt-3 text-[36px] leading-[1] font-[var(--font-display)] tracking-tight md:text-[48px]">
            settings.
          </h1>
        </section>

        <div className="max-w-[640px]">
          <Settings />
        </div>
      </main>
      <Footer />
    </>
  );
}
