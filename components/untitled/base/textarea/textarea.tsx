"use client";

/*
 * Adapted from Untitled UI React v8 textarea.tsx at the commit recorded in
 * docs/third-party/untitled-ui.md. MIT License, copyright 2025 Untitled UI.
 */

import type { ReactNode, Ref } from "react";
import type {
  TextAreaProps as AriaTextAreaProps,
  TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import {
  TextArea as AriaTextArea,
  TextField as AriaTextField,
} from "react-aria-components";

import { FieldHint, FieldLabel } from "@/components/untitled/base/input/field-parts";
import { cn } from "@/lib/utils";

export type TextAreaSize = "sm" | "md";

export interface TextAreaProps
  extends Omit<AriaTextFieldProps, "children" | "className"> {
  label?: string;
  hint?: ReactNode;
  hideRequiredIndicator?: boolean;
  size?: TextAreaSize;
  placeholder?: string;
  rows?: number;
  textAreaRef?: Ref<HTMLTextAreaElement>;
  className?: string;
  textAreaClassName?: AriaTextAreaProps["className"];
}

export function TextArea({
  label,
  hint,
  hideRequiredIndicator = false,
  size = "md",
  placeholder,
  rows = 4,
  textAreaRef,
  className,
  textAreaClassName,
  "aria-label": ariaLabel,
  ...fieldProps
}: TextAreaProps) {
  return (
    <AriaTextField
      {...fieldProps}
      aria-label={ariaLabel ?? (!label ? placeholder : undefined)}
      className={cn("group flex w-full flex-col gap-1.5", className)}
    >
      {({ isDisabled, isInvalid, isRequired }) => (
        <>
          {label && (
            <FieldLabel
              isInvalid={isInvalid}
              isRequired={isRequired && !hideRequiredIndicator}
            >
              {label}
            </FieldLabel>
          )}

          <AriaTextArea
            ref={textAreaRef}
            placeholder={placeholder}
            rows={rows}
            className={(state) =>
              cn(
                "max-h-[200px] min-h-24 w-full resize-y overflow-y-auto rounded-ui-md border border-border-primary bg-bg-primary text-fg-primary shadow-ui-xs outline-none transition-[border-color,box-shadow] duration-100 placeholder:text-fg-quaternary",
                size === "sm" ? "p-3 text-sm" : "px-3.5 py-3 text-base",
                state.isFocused &&
                  !isDisabled &&
                  "border-border-brand ring-[3px] ring-focus-ring",
                isInvalid && "border-error-border",
                isInvalid && state.isFocused && "ring-error-bg",
                isDisabled &&
                  "cursor-not-allowed bg-bg-disabled text-fg-disabled opacity-70",
                typeof textAreaClassName === "function"
                  ? textAreaClassName(state)
                  : textAreaClassName,
              )
            }
          />

          {hint && <FieldHint isInvalid={isInvalid}>{hint}</FieldHint>}
        </>
      )}
    </AriaTextField>
  );
}
