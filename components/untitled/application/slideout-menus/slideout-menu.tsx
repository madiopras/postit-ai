"use client";

/*
 * Adapted from Untitled UI React v8 slideout-menu.tsx at the commit recorded
 * in docs/third-party/untitled-ui.md. MIT License, copyright 2025 Untitled UI.
 */

import type { ReactNode } from "react";
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export interface SlideoutMenuProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: ReactNode;
  className?: string;
  "aria-label": string;
}

/** Accessible mobile side panel with dismiss, Escape, and focus containment. */
export function SlideoutMenu({
  isOpen,
  onOpenChange,
  children,
  className,
  "aria-label": ariaLabel,
}: SlideoutMenuProps) {
  return (
    <AriaModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={(state) =>
        cn(
          "ui-surface fixed inset-0 z-50 flex min-h-dvh justify-start bg-bg-overlay outline-none backdrop-blur-[4px]",
          state.isEntering && "animate-in fade-in duration-200 ease-out",
          state.isExiting && "animate-out fade-out duration-150 ease-in",
        )
      }
    >
      <AriaModal
        className={(state) =>
          cn(
            "h-dvh w-[min(320px,calc(100vw-2rem))] overflow-hidden bg-bg-primary shadow-ui-lg outline-none",
            state.isEntering && "animate-in slide-in-from-left duration-200 ease-out",
            state.isExiting && "animate-out slide-out-to-left duration-150 ease-in",
            className,
          )
        }
      >
        <AriaDialog
          aria-label={ariaLabel}
          className="h-full w-full overflow-hidden outline-none"
        >
          {children}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
