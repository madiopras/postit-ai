"use client";

/*
 * Adapted from Untitled UI React v8 button.tsx at the commit recorded in
 * docs/third-party/untitled-ui.md. MIT License, copyright 2025 Untitled UI.
 */

import type { ReactNode } from "react";
import type {
  ButtonProps as AriaButtonProps,
  LinkProps as AriaLinkProps,
} from "react-aria-components";
import {
  Button as AriaButton,
  Link as AriaLink,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "link"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

interface CommonButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  iconLeading?: ReactNode;
  iconTrailing?: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface ButtonProps
  extends Omit<AriaButtonProps, "children" | "className" | "render">,
    CommonButtonProps {}

export interface ButtonLinkProps
  extends Omit<AriaLinkProps, "children" | "className" | "render">,
    CommonButtonProps {
  href: NonNullable<AriaLinkProps["href"]>;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-2 px-3 py-2 text-sm",
  md: "min-h-10 gap-2 px-3.5 py-2.5 text-sm",
  lg: "min-h-11 gap-2 px-4 py-2.5 text-base",
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-brand-solid text-fg-on-brand shadow-ui-xs hover:bg-brand-solid-hover pressed:bg-brand-solid-hover",
  secondary:
    "border-border-primary bg-bg-primary text-fg-secondary shadow-ui-xs hover:bg-bg-secondary pressed:bg-bg-active",
  tertiary:
    "border-transparent bg-transparent text-fg-secondary hover:bg-bg-secondary pressed:bg-bg-active",
  link:
    "min-h-0 border-transparent bg-transparent p-0 text-brand-text underline decoration-transparent underline-offset-4 hover:decoration-current pressed:opacity-80",
  destructive:
    "border-transparent bg-error-solid text-fg-on-error shadow-ui-xs hover:bg-error-solid-hover pressed:bg-error-solid-hover",
};

function getButtonClassName({
  variant,
  size,
  className,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  className?: string;
}) {
  return cn(
    "group relative inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-ui-md border font-semibold outline-none transition duration-100 ease-linear",
    "focus-visible:ring-[3px] focus-visible:ring-focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&_[data-slot=button-icon]]:pointer-events-none [&_[data-slot=button-icon]]:flex [&_[data-slot=button-icon]]:shrink-0 [&_[data-slot=button-icon]>svg]:size-5",
    sizeStyles[size],
    variantStyles[variant],
    className,
  );
}

function ButtonContent({
  children,
  iconLeading,
  iconTrailing,
  isLoading,
}: Pick<
  CommonButtonProps,
  "children" | "iconLeading" | "iconTrailing" | "isLoading"
>) {
  return (
    <>
      {isLoading ? (
        <svg
          aria-hidden="true"
          data-slot="button-icon"
          viewBox="0 0 20 20"
          fill="none"
          className="size-5 animate-spin"
        >
          <circle
            className="stroke-current opacity-30"
            cx="10"
            cy="10"
            r="8"
            strokeWidth="2"
          />
          <circle
            className="origin-center stroke-current"
            cx="10"
            cy="10"
            r="8"
            strokeWidth="2"
            strokeDasharray="12.5 50"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        iconLeading && (
          <span aria-hidden="true" data-slot="button-icon">
            {iconLeading}
          </span>
        )
      )}

      <span data-slot="button-label">{children}</span>

      {iconTrailing && (
        <span aria-hidden="true" data-slot="button-icon">
          {iconTrailing}
        </span>
      )}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  iconLeading,
  iconTrailing,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      type={props.type ?? "button"}
      isDisabled={isDisabled || isLoading}
      isPending={isLoading}
      data-loading={isLoading || undefined}
      className={getButtonClassName({ variant, size, className })}
      render={(domProps) => (
        <button
          {...domProps}
          aria-busy={isLoading ? "true" : undefined}
        />
      )}
    >
      <ButtonContent
        iconLeading={iconLeading}
        iconTrailing={iconTrailing}
        isLoading={isLoading}
      >
        {children}
      </ButtonContent>
    </AriaButton>
  );
}

export function ButtonLink({
  variant = "link",
  size = "md",
  isLoading = false,
  isDisabled = false,
  iconLeading,
  iconTrailing,
  children,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <AriaLink
      {...props}
      isDisabled={isDisabled || isLoading}
      data-loading={isLoading || undefined}
      className={getButtonClassName({ variant, size, className })}
      render={(domProps) =>
        "href" in domProps ? (
          <a
            {...domProps}
            aria-busy={isLoading ? "true" : undefined}
          />
        ) : (
          <span
            {...domProps}
            aria-busy={isLoading ? "true" : undefined}
          />
        )
      }
    >
      <ButtonContent
        iconLeading={iconLeading}
        iconTrailing={iconTrailing}
        isLoading={isLoading}
      >
        {children}
      </ButtonContent>
    </AriaLink>
  );
}
