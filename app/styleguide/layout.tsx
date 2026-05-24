import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style guide — Wispr",
  description:
    "Internal visual language reference. Not for public eyes. Will be removed before the first ship.",
  robots: { index: false, follow: false },
};

export default function StyleguideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
