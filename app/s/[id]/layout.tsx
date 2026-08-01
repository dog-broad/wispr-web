import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sent to you",
  description:
    "A Wispr share. The content is encrypted in your browser; the key lives in the URL fragment, never on our server.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sent to you — Wispr",
    description: "An encrypted clipboard share. Open the URL to decrypt.",
  },
};

export default function ReceiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
