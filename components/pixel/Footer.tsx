import Link from "next/link";
import { PixelLogo } from "./PixelLogo";
import { HeartIcon, SparkleIcon } from "./icons";
import { cn } from "@/lib/cn";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "relative z-10 mt-16 border-t-[3px] border-[var(--border)] bg-[var(--bg-sunk)]",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6 md:py-10 lg:px-10">
        <div className="flex flex-col gap-2">
          <PixelLogo size="sm" />
          <p className="font-[var(--font-body)] text-[14px] opacity-80">
            Encrypted clipboard for sending text, code, and files.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-[var(--font-body)] text-[14px]">
          <Link href="/about" className="underline underline-offset-4 decoration-[var(--color-pink)] decoration-[3px]">
            About
          </Link>
          <a
            href="https://github.com/dog-broad/wispr-web"
            className="underline underline-offset-4 decoration-[var(--color-moss)] decoration-[3px]"
          >
            Source
          </a>
        </div>

        <p className="inline-flex items-center gap-2 font-[var(--font-mono)] text-[14px] opacity-70">
          made with
          <span className="text-[var(--color-pink)]">
            <HeartIcon size={14} />
          </span>
          and pixels
          <span className="text-[var(--color-marigold)]">
            <SparkleIcon size={14} />
          </span>
        </p>
      </div>
    </footer>
  );
}
