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
import { cn } from "@/lib/utils";

type DashboardButtonVariant =
  | "default"
  | "primary"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "destructive"
  | "error";
type DashboardButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm";

export interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "disabled"> {
  variant?: DashboardButtonVariant;
  size?: DashboardButtonSize;
  disabled?: boolean;
}

const BUTTON_VARIANT: Record<DashboardButtonVariant, string> = {
  default: "btn-primary",
  primary: "btn-primary",
  outline: "btn-outline",
  secondary: "btn-neutral",
  ghost: "btn-ghost",
  link: "btn-link",
  destructive: "btn-error",
  error: "btn-error",
};

const BUTTON_SIZE: Record<DashboardButtonSize, string> = {
  default: "btn-sm",
  sm: "btn-sm",
  lg: "btn-md",
  icon: "btn-square btn-sm",
  "icon-sm": "btn-square btn-xs",
};

export function Button({
  variant = "default",
  size = "default",
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "btn",
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className
      )}
    >
      {children}
    </button>
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
      className={cn("input input-bordered w-full text-sm", className)}
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
      className={cn("textarea textarea-bordered w-full resize-y text-sm", className)}
      {...props}
    />
  );
});

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("card card-border bg-base-100 shadow-xs", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-body gap-1.5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("card-title text-lg text-base-content", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-base-content/60", className)} {...props} />;
}

export function CardAction({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("col-start-2 row-span-2 row-start-1 justify-self-end", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-body pt-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-body pt-0 flex items-center", className)} {...props} />;
}

type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "destructive"
  | "error"
  | "warning"
  | "success"
  | "info";

const BADGE_VARIANT: Record<BadgeVariant, string> = {
  default: "badge-primary",
  primary: "badge-primary",
  secondary: "badge-neutral",
  outline: "badge-ghost border-base-300",
  destructive: "badge-error",
  error: "badge-error",
  warning: "badge-warning",
  success: "badge-success",
  info: "badge-info",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("badge", BADGE_VARIANT[variant], className)}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton", className)}
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
      className="alert alert-error flex flex-col gap-3 text-sm sm:flex-row sm:items-center"
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
      <table className={cn("table table-sm w-full min-w-[640px]", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={cn("", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return <tr className={cn("hover:bg-base-200/50 transition-colors", className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn("text-left text-xs font-semibold text-base-content/60", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return <td className={cn("py-3 text-sm text-base-content", className)} {...props} />;
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
        "select select-bordered w-full text-sm",
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
  id,
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      type="checkbox"
      id={id}
      role="switch"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn("toggle toggle-primary", className)}
    />
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

  if (!context.open) return null;

  return (
    <dialog className="modal modal-open" aria-modal="true">
      <div className={cn("modal-box bg-base-100", className)}>{children}</div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={() => context.onOpenChange(false)}>close</button>
      </form>
    </dialog>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-base-content", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-base-content/60", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("modal-action mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function DropdownMenu({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("dropdown dropdown-end", className)}>{children}</div>;
}

export function DropdownMenuTrigger({ className, children, ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      tabIndex={0}
      className={cn("cursor-pointer outline-none", className)}
      {...props}
    >
      {children}
    </button>
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
    <ul
      tabIndex={0}
      className={cn(
        "dropdown-content menu z-50 min-w-44 rounded-box border border-base-200 bg-base-100 p-1 shadow-lg",
        className,
      )}
    >
      {children}
    </ul>
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
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn("flex w-full items-center gap-2 px-2 py-2 text-sm text-base-content hover:bg-base-200", className)}
      >
        {children}
      </button>
    </li>
  );
}
