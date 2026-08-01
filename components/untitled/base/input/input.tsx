"use client";

/*
 * Adapted from Untitled UI React v8 input.tsx at the commit recorded in
 * docs/third-party/untitled-ui.md. MIT License, copyright 2025 Untitled UI.
 */

import type { ReactNode, Ref } from "react";
import { useState } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import type {
  InputProps as AriaInputProps,
  TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import {
  Button as AriaButton,
  Group as AriaGroup,
  Input as AriaInput,
  TextField as AriaTextField,
} from "react-aria-components";

import { FieldHint, FieldLabel } from "@/components/untitled/base/input/field-parts";
import { cn } from "@/lib/utils";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<AriaTextFieldProps, "children" | "className"> {
  label?: string;
  hint?: ReactNode;
  hideRequiredIndicator?: boolean;
  size?: InputSize;
  placeholder?: string;
  type?: AriaInputProps["type"];
  autoComplete?: AriaInputProps["autoComplete"];
  autoFocus?: AriaInputProps["autoFocus"];
  inputMode?: AriaInputProps["inputMode"];
  leadingIcon?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
}

const sizeStyles: Record<
  InputSize,
  { wrapper: string; input: string; icon: string }
> = {
  sm: {
    wrapper: "min-h-9",
    input: "px-3 py-2 text-sm",
    icon: "px-3 [&>svg]:size-4",
  },
  md: {
    wrapper: "min-h-10",
    input: "px-3.5 py-2.5 text-sm",
    icon: "px-3.5 [&>svg]:size-5",
  },
  lg: {
    wrapper: "min-h-11",
    input: "px-3.5 py-2.5 text-base",
    icon: "px-3.5 [&>svg]:size-5",
  },
};

export function Input({
  label,
  hint,
  hideRequiredIndicator = false,
  size = "md",
  placeholder,
  type = "text",
  autoComplete,
  autoFocus,
  inputMode,
  leadingIcon,
  inputRef,
  className,
  inputClassName,
  "aria-label": ariaLabel,
  ...fieldProps
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";

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

          <AriaGroup
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            className={({ isFocusWithin }) =>
              cn(
                "relative flex w-full items-center overflow-hidden rounded-ui-md border border-border-primary bg-bg-primary shadow-ui-xs transition-[border-color,box-shadow] duration-100",
                sizeStyles[size].wrapper,
                isFocusWithin &&
                  !isDisabled &&
                  "border-border-brand ring-[3px] ring-focus-ring",
                isInvalid && "border-error-border",
                isInvalid && isFocusWithin && "ring-error-bg",
                isDisabled &&
                  "cursor-not-allowed bg-bg-disabled text-fg-disabled opacity-70",
              )
            }
          >
            {leadingIcon && (
              <span
                aria-hidden="true"
                className={cn(
                  "flex shrink-0 text-fg-quaternary",
                  sizeStyles[size].icon,
                  "pr-0",
                )}
              >
                {leadingIcon}
              </span>
            )}

            <AriaInput
              ref={inputRef}
              type={isPassword && isPasswordVisible ? "text" : type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
              inputMode={inputMode}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-fg-primary outline-none placeholder:text-fg-quaternary disabled:cursor-not-allowed",
                sizeStyles[size].input,
                leadingIcon && "pl-2.5",
                (isPassword || isInvalid) && "pr-1",
                inputClassName,
              )}
            />

            {isInvalid && !isPassword && (
              <span
                aria-hidden="true"
                className={cn(
                  "flex shrink-0 text-error-fg",
                  sizeStyles[size].icon,
                  "pl-0",
                )}
              >
                <CircleAlert />
              </span>
            )}

            {isPassword && (
              <AriaButton
                aria-label={
                  isPasswordVisible
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center justify-center text-fg-quaternary outline-none hover:text-fg-secondary focus-visible:ring-[3px] focus-visible:ring-focus-ring",
                  sizeStyles[size].icon,
                  "pl-1",
                )}
              >
                {isPasswordVisible ? <EyeOff /> : <Eye />}
              </AriaButton>
            )}
          </AriaGroup>

          {hint && <FieldHint isInvalid={isInvalid}>{hint}</FieldHint>}
        </>
      )}
    </AriaTextField>
  );
}
