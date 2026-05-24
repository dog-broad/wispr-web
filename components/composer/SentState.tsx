"use client";

import { useEffect, useState } from "react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelQr } from "@/components/pixel/PixelQr";
import { WispMascot } from "@/components/pixel/WispMascot";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export interface SentDetails {
  id: string;
  url: string;
  copied: boolean;
  expiresAt: Date;
}

export interface SentStateProps {
  details: SentDetails;
  onSendAnother: () => void;
}

export function SentState({ details, onSendAnother }: SentStateProps) {
  const [copied, setCopied] = useState(details.copied);
  const remaining = useCountdown(details.expiresAt);

  async function copyAgain() {
    try {
      await navigator.clipboard.writeText(details.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-8 right-4 z-10 hidden md:block md:-top-12 md:right-8">
        <WispMascot state="sending" size={3} />
      </div>

      <PixelCard variant="lifted" accent="moss">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <PixelBadge tone="success">
              <PixelIcon name="forward" size={12} />
              sent via link
            </PixelBadge>
            <span className="ml-auto md:hidden">
              <WispMascot state="sending" size={2} />
            </span>
            {copied ? (
              <span className="inline-flex items-center gap-1 font-[var(--font-body)] text-[14px] text-[var(--color-moss)]">
                <PixelIcon name="check" size={14} />
                copied
              </span>
            ) : (
              <span className="font-[var(--font-body)] text-[14px] opacity-70">
                Copy this URL — it&rsquo;s not stored anywhere.
              </span>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-start">
            <div className="flex justify-center md:block">
              <PixelQr value={details.url} size={168} label="Receive URL QR code" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="overflow-hidden border-[2px] border-[var(--border)] bg-[var(--bg-sunk)] p-3">
                <p className="break-all font-[var(--font-mono)] text-[16px] leading-tight">
                  {details.url}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <PixelButton
                  variant="ghost"
                  size="sm"
                  leading={<PixelIcon name="copy" size={14} />}
                  onClick={copyAgain}
                >
                  {copied ? "Copy again" : "Copy URL"}
                </PixelButton>
              </div>

              <div className="grid grid-cols-1 gap-2 font-[var(--font-body)] text-[14px] sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <PixelIcon name="zap" size={14} />
                  <span className="opacity-70">Expires in</span>
                  <span className="num font-semibold">{remaining}</span>
                </p>
                <p className="flex items-center gap-2">
                  <PixelIcon name="eye" size={14} />
                  <span className="num font-semibold">1</span>
                  <span className="opacity-70">read remaining</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PixelButton variant="primary" size="md" block onClick={onSendAnother}>
              Send another
            </PixelButton>
            <PixelButton
              variant="ghost"
              size="md"
              block
              disabled
              title="Live read counter ships with the next release"
            >
              Watch for reads
            </PixelButton>
          </div>
        </div>
      </PixelCard>
    </section>
  );
}

function useCountdown(target: Date): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const remainingMs = Math.max(0, target.getTime() - now);
  return formatCountdown(remainingMs);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "expired";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
