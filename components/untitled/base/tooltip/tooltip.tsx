"use client";

/*
 * Adapted from Untitled UI React v8 tooltip.tsx at the commit recorded in
 * docs/third-party/untitled-ui.md. MIT License, copyright 2025 Untitled UI.
 */

import type { ReactElement, ReactNode } from "react";
import {
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export function Tooltip({
  children,
  content,
  delay = 400,
}: {
  children: ReactElement;
  content: ReactNode;
  delay?: number;
}) {
  return (
    <AriaTooltipTrigger delay={delay} closeDelay={100}>
      {children}
      <AriaTooltip
        offset={6}
        className={(state) =>
          cn(
            "ui-surface z-50 max-w-64 rounded-ui-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-ui-sm outline-none dark:bg-gray-100 dark:text-gray-900",
            state.isEntering && "animate-in fade-in zoom-in-95 duration-100",
            state.isExiting && "animate-out fade-out zoom-out-95 duration-75",
          )
        }
      >
        {content}
      </AriaTooltip>
    </AriaTooltipTrigger>
  );
}
