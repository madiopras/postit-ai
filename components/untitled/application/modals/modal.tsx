"use client";

/*
 * Adapted from Untitled UI React v8 modal.tsx at the commit recorded in
 * docs/third-party/untitled-ui.md. MIT License, copyright 2025 Untitled UI.
 */

import type {
  DialogProps as AriaDialogProps,
  HeadingProps as AriaHeadingProps,
  ModalOverlayProps as AriaModalOverlayProps,
  TextProps as AriaTextProps,
} from "react-aria-components";
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  Text as AriaText,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export const DialogTrigger = AriaDialogTrigger;

export function ModalOverlay({
  className,
  ...props
}: AriaModalOverlayProps) {
  return (
    <AriaModalOverlay
      {...props}
      className={(state) =>
        cn(
          "ui-surface fixed inset-0 z-50 flex min-h-dvh w-full items-end justify-center bg-bg-overlay px-4 py-4 outline-none backdrop-blur-[6px] sm:items-center sm:px-8 sm:py-8",
          state.isEntering && "animate-in fade-in duration-200 ease-out",
          state.isExiting && "animate-out fade-out duration-150 ease-in",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

export function Modal({ className, ...props }: AriaModalOverlayProps) {
  return (
    <AriaModal
      {...props}
      className={(state) =>
        cn(
          "max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-hidden rounded-ui-xl bg-bg-primary align-middle shadow-ui-lg outline-none",
          state.isEntering && "animate-in zoom-in-95 duration-200 ease-out",
          state.isExiting && "animate-out zoom-out-95 duration-150 ease-in",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

export function Dialog({ className, ...props }: AriaDialogProps) {
  return (
    <AriaDialog
      {...props}
      className={cn(
        "relative max-h-[inherit] w-full overflow-y-auto p-6 outline-none",
        className,
      )}
    />
  );
}

export function ModalTitle({ className, ...props }: AriaHeadingProps) {
  return (
    <AriaHeading
      {...props}
      slot="title"
      className={cn("text-lg font-semibold text-fg-primary", className)}
    />
  );
}

export function ModalDescription({ className, ...props }: AriaTextProps) {
  return (
    <AriaText
      {...props}
      slot="description"
      className={cn("text-sm text-fg-tertiary", className)}
    />
  );
}
