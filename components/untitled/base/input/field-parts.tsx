"use client";

/*
 * Adapted from Untitled UI React v8 label.tsx and hint-text.tsx. MIT License,
 * copyright 2025 Untitled UI. See docs/third-party/untitled-ui.md.
 */

import type { ReactNode } from "react";
import type {
  LabelProps as AriaLabelProps,
  TextProps as AriaTextProps,
} from "react-aria-components";
import {
  Label as AriaLabel,
  Text as AriaText,
} from "react-aria-components";

import { cn } from "@/lib/utils";

interface FieldLabelProps extends Omit<AriaLabelProps, "children"> {
  children: ReactNode;
  isRequired?: boolean;
  isInvalid?: boolean;
}

export function FieldLabel({
  children,
  isRequired,
  isInvalid,
  className,
  ...props
}: FieldLabelProps) {
  return (
    <AriaLabel
      {...props}
      className={cn("text-sm font-medium text-fg-secondary", className)}
    >
      {children}
      {isRequired && (
        <span
          aria-hidden="true"
          className={cn(
            "ml-0.5 text-brand-text",
            isInvalid && "text-error-fg",
          )}
        >
          *
        </span>
      )}
    </AriaLabel>
  );
}

interface FieldHintProps extends Omit<AriaTextProps, "children"> {
  children: ReactNode;
  isInvalid?: boolean;
}

export function FieldHint({
  children,
  isInvalid,
  className,
  ...props
}: FieldHintProps) {
  return (
    <AriaText
      {...props}
      slot={isInvalid ? "errorMessage" : "description"}
      className={cn(
        "text-sm text-fg-tertiary",
        isInvalid && "text-error-fg",
        className,
      )}
    >
      {children}
    </AriaText>
  );
}

