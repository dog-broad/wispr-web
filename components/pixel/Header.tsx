import Link from "next/link";
import { PixelLogo } from "./PixelLogo";
import { ThemeToggle } from "./ThemeToggle";
import { HeaderNav } from "./HeaderNav";
import { cn } from "@/lib/cn";

export function Header({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "relative z-10 mx-auto flex w-full max-w-[1120px] items-center justify-between",
        "px-4 py-4 md:px-6 lg:px-10 lg:py-6",
        className,
      )}
    >
      <Link href="/" className="inline-flex items-center gap-2 text-[var(--fg)]">
        <PixelLogo size="md" />
      </Link>

      <HeaderNav />

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
