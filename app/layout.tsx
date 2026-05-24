import type { Metadata, Viewport } from "next";
import { Silkscreen, Pixelify_Sans, VT323 } from "next/font/google";
import { Scanlines } from "@/components/pixel/Scanlines";
import { DitherBg } from "@/components/pixel/DitherBg";
import { ThemeBootstrap } from "@/components/pixel/ThemeBootstrap";
import "./globals.css";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
  display: "swap",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wispr — encrypted clipboard for sending text, code, and files",
    template: "%s — Wispr",
  },
  description:
    "A zero-knowledge clipboard that moves text, code, and files between your devices and to other people. Encrypted in your browser before it leaves.",
  metadataBase: new URL("https://wispr.rushyendra.dev"),
  openGraph: {
    type: "website",
    siteName: "Wispr",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ecd8" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1a2e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${silkscreen.variable} ${pixelify.variable} ${vt323.variable}`;
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <body className="relative min-h-screen">
        <ThemeBootstrap />
        <DitherBg />
        {children}
        <Scanlines />
      </body>
    </html>
  );
}
