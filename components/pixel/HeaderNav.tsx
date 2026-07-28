"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/useSession";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/cn";

// Auth-aware header nav. Split out from the (server) Header so it can read the
// client-side session signal: signed-out shows Sign in, signed-in swaps to the
// member affordances + a way out. While the session is still loading we render
// no auth pill at all, so a signed-in member never flashes a wrong "Sign in".
export function HeaderNav() {
  const { session, loading } = useSession();
  const router = useRouter();

  async function signOut() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="hidden items-center gap-2 md:flex">
      <NavLink href="/about">About</NavLink>
      {loading ? null : session ? (
        <>
          <NavLink href="/me">My clips</NavLink>
          {session.isAdmin && <NavLink href="/me/admin">Admin</NavLink>}
          <button type="button" onClick={signOut} className={pillClass("ghost")}>
            Sign out
          </button>
        </>
      ) : (
        <NavLink href="/login" variant="primary">
          Sign in
        </NavLink>
      )}
    </nav>
  );
}

function pillClass(variant: "ghost" | "primary"): string {
  return cn(
    "pixel-press inline-flex h-10 items-center border-[2px] px-3 font-[var(--font-body)] text-[14px]",
    variant === "primary"
      ? "bg-[var(--color-pink)] text-[var(--color-navy)] border-[var(--color-navy)] shadow-[3px_3px_0_0_var(--color-navy)]"
      : "bg-[var(--bg-lifted)] text-[var(--fg)] border-[var(--border)] shadow-[3px_3px_0_0_var(--border)]",
  );
}

function NavLink({
  href,
  children,
  variant = "ghost",
}: {
  href: "/about" | "/login" | "/me" | "/me/admin";
  children: React.ReactNode;
  variant?: "ghost" | "primary";
}) {
  return (
    <Link href={href} className={pillClass(variant)}>
      {children}
    </Link>
  );
}
