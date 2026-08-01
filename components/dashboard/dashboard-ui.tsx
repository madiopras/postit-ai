"use client";

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Switch as AriaSwitch,
} from "react-aria-components";

import {
  Button as UntitledButton,
  type ButtonProps as UntitledButtonProps,
} from "@/components/untitled/base/buttons/button";
import {
  Dialog as UntitledDialog,
  Modal,
  ModalDescription,
  ModalOverlay,
  ModalTitle,
} from "@/components/untitled/application/modals/modal";
import { cn } from "@/lib/utils";

type DashboardButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "destructive";
type DashboardButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm";

export interface ButtonProps
  extends Omit<UntitledButtonProps, "variant" | "size" | "isDisabled"> {
  variant?: DashboardButtonVariant;
  size?: DashboardButtonSize;
  disabled?: boolean;
}

const buttonVariant = {
  default: "primary",
  outline: "secondary",
  secondary: "secondary",
  ghost: "tertiary",
  link: "link",
  destructive: "destructive",
} as const;

export function Button({
  variant = "default",
  size = "default",
  disabled,
  className,
  ...props
}: ButtonProps) {
  const untitledSize = size === "lg" ? "lg" : size === "default" ? "md" : "sm";

  return (
    <UntitledButton
      {...props}
      variant={buttonVariant[variant]}
      size={untitledSize}
      isDisabled={disabled}
      className={cn(
        (size === "icon" || size === "icon-sm") && "size-9 min-h-9 px-2",
        className,
      )}
    />
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input">
>(function DashboardInput({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "min-h-10 w-full rounded-ui-md border border-border-primary bg-bg-primary px-3.5 py-2.5 text-sm text-fg-primary shadow-ui-xs outline-none transition placeholder:text-fg-quaternary",
        "focus:border-border-brand focus:ring-[3px] focus:ring-focus-ring",
        "disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-fg-disabled",
        "aria-invalid:border-error-border aria-invalid:ring-error-bg",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function DashboardTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full resize-y rounded-ui-md border border-border-primary bg-bg-primary px-3.5 py-3 text-sm text-fg-primary shadow-ui-xs outline-none transition placeholder:text-fg-quaternary",
        "focus:border-border-brand focus:ring-[3px] focus:ring-focus-ring",
        "disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-fg-disabled",
        "aria-invalid:border-error-border aria-invalid:ring-error-bg",
        className,
      )}
      {...props}
    />
  );
});

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-ui-xl border border-border-secondary bg-bg-primary shadow-ui-xs",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1.5 p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-fg-primary", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-fg-tertiary", className)} {...props} />;
}

export function CardAction({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("col-start-2 row-span-2 row-start-1 justify-self-end", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />;
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    default: "border-transparent bg-brand-subtle text-brand-text",
    secondary: "border-transparent bg-bg-tertiary text-fg-secondary",
    outline: "border-border-primary bg-bg-primary text-fg-secondary",
    destructive: "border-error-border bg-error-bg text-error-fg",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-ui-sm bg-bg-tertiary", className)}
      {...props}
    />
  );
}

export function TableError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-ui-lg border border-error-border bg-error-bg p-4 text-sm text-error-fg sm:flex-row sm:items-center"
    >
      <span>{message}</span>
      <Button variant="outline" size="sm" className="sm:ml-auto" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}

export function Table({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("border-b border-border-secondary bg-bg-secondary", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={cn("divide-y divide-border-secondary", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return <tr className={cn("min-h-13 transition-colors hover:bg-bg-secondary", className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn("h-11 whitespace-nowrap px-4 text-left text-xs font-semibold text-fg-tertiary", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return <td className={cn("h-13 px-4 py-3 text-fg-secondary", className)} {...props} />;
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
}

export function SelectItem(_props: SelectItemProps) {
  void _props;
  return null;
}

export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectTrigger(_props: { children?: ReactNode; className?: string }) {
  void _props;
  return null;
}

export function SelectValue(_props: { placeholder?: string }) {
  void _props;
  return null;
}

function findChild(
  children: ReactNode,
  component: unknown,
): ReactElement | undefined {
  return Children.toArray(children).find(
    (child): child is ReactElement => isValidElement(child) && child.type === component,
  );
}

export function Select({
  value,
  onValueChange,
  children,
  disabled,
  "aria-label": ariaLabel,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const trigger = findChild(children, SelectTrigger);
  const content = findChild(children, SelectContent);
  const triggerProps = trigger?.props as { className?: string; children?: ReactNode } | undefined;
  const valueMarker = triggerProps
    ? findChild(triggerProps.children, SelectValue)
    : undefined;
  const valueProps = valueMarker?.props as { placeholder?: string } | undefined;
  const items = Children.toArray(
    (content?.props as { children?: ReactNode } | undefined)?.children,
  ).flatMap((child) => (Array.isArray(child) ? child : [child]));

  return (
    <select
      aria-label={ariaLabel ?? valueProps?.placeholder ?? "Pilih opsi"}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
      className={cn(
        "min-h-10 rounded-ui-md border border-border-primary bg-bg-primary px-3.5 py-2.5 text-sm text-fg-primary shadow-ui-xs outline-none",
        "focus:border-border-brand focus:ring-[3px] focus:ring-focus-ring",
        "disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-fg-disabled",
        triggerProps?.className,
      )}
    >
      {items.map((child, index) => {
        if (!isValidElement<SelectItemProps>(child) || child.type !== SelectItem) return null;
        return (
          <option key={`${child.props.value}-${index}`} value={child.props.value}>
            {child.props.children}
          </option>
        );
      })}
    </select>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <AriaSwitch
      {...props}
      isSelected={checked}
      onChange={onCheckedChange}
      isDisabled={disabled}
      className={cn(
        "group inline-flex cursor-pointer items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span className="flex h-6 w-11 items-center rounded-full bg-bg-tertiary p-0.5 transition group-selected:bg-brand-solid">
        <span className="size-5 rounded-full bg-bg-primary shadow-ui-sm transition-transform group-selected:translate-x-5" />
      </span>
    </AriaSwitch>
  );
}

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: DialogContextValue & { children: ReactNode }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({ className, children }: { className?: string; children: ReactNode }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error("DialogContent harus berada di dalam Dialog");

  return (
    <ModalOverlay isOpen={context.open} onOpenChange={context.onOpenChange} isDismissable>
      <Modal className={className}>
        <UntitledDialog>{children}</UntitledDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

export const DialogTitle = ModalTitle;
export const DialogDescription = ModalDescription;

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const DropdownMenu = MenuTrigger;

export function DropdownMenuTrigger({ className, ...props }: ComponentPropsWithoutRef<typeof AriaButton>) {
  return (
    <AriaButton
      {...props}
      className={cn(
        "cursor-pointer rounded-ui-md outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring",
        className,
      )}
    />
  );
}

export function DropdownMenuContent({
  className,
  children,
}: {
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Popover
      placement="bottom end"
      className="ui-surface z-50 min-w-44 rounded-ui-md border border-border-secondary bg-bg-primary p-1 shadow-ui-lg outline-none"
    >
      <Menu className={cn("outline-none", className)}>{children}</Menu>
    </Popover>
  );
}

export function DropdownMenuItem({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <MenuItem
      onAction={onClick}
      className={cn(
        "flex min-h-9 cursor-pointer items-center rounded-ui-sm px-2.5 py-2 text-sm text-fg-secondary outline-none hover:bg-bg-secondary focused:bg-bg-secondary",
        className,
      )}
    >
      {children}
    </MenuItem>
  );
}
