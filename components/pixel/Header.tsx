import Link from "next/link";
import { PixelLogo } from "./PixelLogo";
import { ThemeToggle } from "./ThemeToggle";
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

      <nav className="hidden items-center gap-2 md:flex">
        <NavLink href="/about">About</NavLink>
        <NavLink href="/about" variant="primary">
          Sign in
        </NavLink>
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  variant = "ghost",
}: {
  href: "/" | "/about";
  children: React.ReactNode;
  variant?: "ghost" | "primary";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--color-pink)] text-[var(--color-navy)] border-[var(--color-navy)] shadow-[3px_3px_0_0_var(--color-navy)]"
      : "bg-[var(--bg-lifted)] text-[var(--fg)] border-[var(--border)] shadow-[3px_3px_0_0_var(--border)]";
  return (
    <Link
      href={href}
      className={cn(
        "pixel-press inline-flex h-10 items-center border-[2px] px-3 font-[var(--font-body)] text-[14px]",
        styles,
      )}
    >
      {children}
    </Link>
  );
}
