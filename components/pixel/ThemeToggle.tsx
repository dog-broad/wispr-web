"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    if (current) setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("wispr-theme", next);
    } catch {
      // localStorage blocked: toggle still works for this tab.
    }
  }

  // Render a placeholder of the same size pre-hydration to avoid a layout shift.
  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block h-10 w-10 border-2 border-current bg-transparent",
          className,
        )}
      />
    );
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "pixel-press relative inline-flex h-10 w-10 items-center justify-center",
        "border-2 border-[var(--border)] bg-[var(--bg-lifted)]",
        "shadow-[var(--shadow-pixel-sm)]",
        className,
      )}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={20}
      height={20}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <g fill="var(--color-marigold)">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="7" y="13" width="2" height="2" />
        <rect x="1" y="7" width="2" height="2" />
        <rect x="13" y="7" width="2" height="2" />
        <rect x="2" y="2" width="2" height="2" />
        <rect x="12" y="2" width="2" height="2" />
        <rect x="2" y="12" width="2" height="2" />
        <rect x="12" y="12" width="2" height="2" />
        <rect x="5" y="5" width="6" height="6" />
      </g>
      <g fill="var(--color-marigold-dark)">
        <rect x="5" y="5" width="2" height="2" />
        <rect x="9" y="9" width="2" height="2" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={20}
      height={20}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <g fill="var(--color-cream)">
        <rect x="5" y="2" width="6" height="2" />
        <rect x="3" y="4" width="4" height="2" />
        <rect x="3" y="6" width="2" height="6" />
        <rect x="5" y="10" width="2" height="2" />
        <rect x="7" y="12" width="6" height="2" />
        <rect x="9" y="11" width="4" height="1" />
      </g>
      <g fill="var(--color-marigold)">
        <rect x="11" y="4" width="1" height="1" />
        <rect x="13" y="6" width="1" height="1" />
        <rect x="12" y="9" width="1" height="1" />
      </g>
    </svg>
  );
}
