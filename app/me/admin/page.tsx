import type { Metadata } from "next";
import { Header } from "@/components/pixel/Header";
import { Footer } from "@/components/pixel/Footer";
import { AdminBoard } from "@/components/me/admin/AdminBoard";

export const metadata: Metadata = {
  title: "Operator console",
  description: "Wispr operator status board.",
  alternates: { canonical: "/me/admin" },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[1280px] px-4 pb-16 md:px-6 lg:px-8">
        <AdminBoard />
      </main>
      <Footer />
    </>
  );
}
