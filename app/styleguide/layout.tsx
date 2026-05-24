import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style guide — Wispr",
  description:
    "Internal visual language reference. Not for public eyes. Will be decommissioned before M1 ships.",
  robots: { index: false, follow: false },
};

export default function StyleguideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
