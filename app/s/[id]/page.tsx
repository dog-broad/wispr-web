import { Footer } from "@/components/pixel/Footer";
import { Header } from "@/components/pixel/Header";
import { Receive } from "./Receive";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Server component. We deliberately render only a Header / Footer shell
// at SSR time. The actual fetch + decrypt happens in the Receive
// client component once the URL fragment is available. The page is
// noindex via the layout's metadata + the X-Robots-Tag header (set in
// next.config.ts), so a stray crawler that hits the SSR shell sees an
// empty receive frame and is told not to keep it.
export default async function ReceivePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <Header />
      <main className="relative mx-auto w-full max-w-[960px] px-4 pb-16 pt-6 md:px-6 md:pt-12 lg:px-10">
        <Receive snippetId={id} />
      </main>
      <Footer />
    </>
  );
}
