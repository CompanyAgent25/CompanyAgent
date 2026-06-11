"use client";

import { clsx } from "clsx";

interface BrandMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tone?: "dark" | "light";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function BrandMark({
  className,
  size = "md",
  showWordmark = false,
  tone = "dark",
}: BrandMarkProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div
        className={clsx(
          "grid shrink-0 place-items-center rounded-lg border font-mono font-semibold tracking-normal shadow-sm",
          sizeMap[size],
          tone === "dark"
            ? "border-white/15 bg-white text-neutral-950"
            : "border-neutral-200 bg-neutral-950 text-white"
        )}
        aria-hidden="true"
      >
        C/A
      </div>
      {showWordmark && (
        <div className="min-w-0">
          <p
            className={clsx(
              "truncate text-sm font-semibold leading-5 tracking-normal",
              tone === "dark" ? "text-white" : "text-neutral-950"
            )}
          >
            CompanyAgent
          </p>
          <p
            className={clsx(
              "truncate text-xs leading-4",
              tone === "dark" ? "text-white/50" : "text-neutral-500"
            )}
          >
            Multi-agent workspace
          </p>
        </div>
      )}
    </div>
  );
}
