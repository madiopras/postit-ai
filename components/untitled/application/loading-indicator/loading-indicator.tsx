"use client";

/*
 * Adapted from Untitled UI React v8 loading-indicator.tsx at the commit
 * recorded in docs/third-party/untitled-ui.md. MIT License, copyright 2025
 * Untitled UI.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type LoadingIndicatorSize = "sm" | "md" | "lg";

export interface LoadingIndicatorProps {
  size?: LoadingIndicatorSize;
  label?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

const sizeStyles: Record<
  LoadingIndicatorSize,
  { root: string; spinner: string }
> = {
  sm: { root: "gap-3 text-sm", spinner: "size-6" },
  md: { root: "gap-3 text-sm", spinner: "size-10" },
  lg: { root: "gap-4 text-base", spinner: "size-12" },
};

export function LoadingIndicator({
  size = "sm",
  label,
  className,
  "aria-label": ariaLabel = "Memuat",
}: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={!label ? ariaLabel : undefined}
      className={cn(
        "flex flex-col items-center justify-center text-fg-secondary",
        sizeStyles[size].root,
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className={cn("animate-spin", sizeStyles[size].spinner)}
        viewBox="0 0 32 32"
        fill="none"
      >
        <circle
          className="stroke-bg-tertiary"
          cx="16"
          cy="16"
          r="14"
          strokeWidth="4"
        />
        <circle
          className="stroke-brand-solid"
          cx="16"
          cy="16"
          r="14"
          strokeWidth="4"
          strokeDashoffset="75"
          strokeDasharray="100"
          strokeLinecap="round"
        />
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}

