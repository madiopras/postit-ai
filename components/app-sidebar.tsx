"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronDown,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Menu, MenuItem, MenuTrigger, Popover, Separator } from "react-aria-components";

import { Button } from "@/components/untitled/base/buttons/button";
import { SlideoutMenu } from "@/components/untitled/application/slideout-menus/slideout-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onMobileOpenChange: (isOpen: boolean) => void;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: ReactNode;
  superAdminOnly?: boolean;
}

const PRIMARY_ITEMS: NavigationItem[] = [
  { label: "Ringkasan", href: "/dashboard", icon: <LayoutDashboard /> },
  { label: "FAQ", href: "/dashboard/faq", icon: <MessageSquare /> },
  { label: "SOP", href: "/dashboard/sop", icon: <FileText /> },
  { label: "Dokumen", href: "/dashboard/documents", icon: <Folder /> },
  { label: "Pengguna", href: "/dashboard/users", icon: <Users /> },
  {
    label: "Admin",
    href: "/dashboard/admins",
    icon: <UserCog />,
    superAdminOnly: true,
  },
];

const SETTINGS_ITEMS: NavigationItem[] = [
  {
    label: "Konfigurasi AI",
    href: "/dashboard/config",
    icon: <Settings />,
    superAdminOnly: true,
  },
  {
    label: "Log audit",
    href: "/dashboard/audit-logs",
    icon: <ShieldCheck />,
    superAdminOnly: true,
  },
];

export function AppSidebar({
  isCollapsed,
  isMobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) {
  const identity = useCurrentUser();
  return (
    <>
      <aside
        aria-label="Navigasi dashboard"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border-secondary bg-bg-primary transition-[width] duration-200 md:flex",
          isCollapsed ? "w-20" : "w-[280px]",
        )}
      >
        <SidebarContent identity={identity} isCollapsed={isCollapsed} />
      </aside>

      <SlideoutMenu
        isOpen={isMobileOpen}
        onOpenChange={onMobileOpenChange}
        aria-label="Navigasi dashboard"
      >
        <div className="absolute right-3 top-3 z-10">
          <Button
            variant="tertiary"
            size="sm"
            className="size-9 px-2"
            onPress={() => onMobileOpenChange(false)}
            aria-label="Tutup navigasi dashboard"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <SidebarContent
          identity={identity}
          isCollapsed={false}
          onNavigate={() => onMobileOpenChange(false)}
        />
      </SlideoutMenu>
    </>
  );
}

function SidebarContent({
  identity,
  isCollapsed,
  onNavigate,
}: {
  identity: ReturnType<typeof useCurrentUser>;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const user = identity.user;
  const isSuperAdmin = user?.role === "super_admin";
  const name = user?.displayName?.trim() || user?.username || "Memuat akun";
  const visiblePrimary = PRIMARY_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);
  const visibleSettings = SETTINGS_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn(
          "flex h-20 shrink-0 items-center gap-3 border-b border-border-secondary px-5 outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus-ring",
          isCollapsed && "justify-center px-3",
        )}
        aria-label={isCollapsed ? "PostIt AI Admin" : undefined}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-ui-lg bg-brand-solid text-fg-on-brand">
          <Bot className="size-5" aria-hidden="true" />
        </span>
        {!isCollapsed && (
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-fg-primary">PostIt AI</span>
            <span className="block truncate text-xs text-fg-tertiary">Admin dashboard</span>
          </span>
        )}
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3" aria-label="Menu utama">
        <NavigationGroup
          label="Konten"
          items={visiblePrimary}
          pathname={pathname}
          isCollapsed={isCollapsed}
          onNavigate={onNavigate}
        />
        {visibleSettings.length > 0 && (
          <NavigationGroup
            label="Sistem"
            items={visibleSettings}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        )}
      </nav>

      <div className="border-t border-border-secondary p-3">
        {user ? (
          <MenuTrigger>
            <Button
              variant="tertiary"
              size="md"
              className={cn("w-full justify-start px-2", isCollapsed && "justify-center")}
              aria-label={`Buka menu profil ${name}`}
              isLoading={identity.logoutPending}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-text">
                {name.charAt(0).toLocaleUpperCase("id-ID")}
              </span>
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    <span className="block truncate text-xs font-normal text-fg-tertiary">@{user.username}</span>
                  </span>
                  <ChevronDown className="size-4 text-fg-quaternary" aria-hidden="true" />
                </>
              )}
            </Button>
            <Popover
              placement={isCollapsed ? "right bottom" : "top start"}
              offset={8}
              className="ui-surface z-[60] w-64 rounded-ui-lg border border-border-secondary bg-bg-primary p-1.5 shadow-ui-lg outline-none"
            >
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-fg-primary">{name}</p>
                <p className="truncate text-xs text-fg-tertiary">@{user.username}</p>
                <p className="mt-2 text-xs font-medium text-fg-quaternary">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </p>
              </div>
              <Separator className="my-1 h-px bg-border-secondary" />
              <Menu
                aria-label="Menu profil"
                onAction={(key) => {
                  if (key === "logout") void identity.logout();
                }}
                className="outline-none"
              >
                <MenuItem
                  id="logout"
                  isDisabled={identity.logoutPending}
                  className={({ isFocused, isDisabled }) =>
                    cn(
                      "flex min-h-10 cursor-pointer items-center gap-2 rounded-ui-md px-3 py-2 text-sm font-medium text-error-fg outline-none",
                      isFocused && "bg-error-bg",
                      isDisabled && "cursor-not-allowed opacity-50",
                    )
                  }
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Keluar
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        ) : (
          <div
            className="h-11 animate-pulse rounded-ui-md bg-bg-tertiary"
            role="status"
            aria-label="Memuat profil"
          />
        )}
      </div>
    </div>
  );
}

function NavigationGroup({
  label,
  items,
  pathname,
  isCollapsed,
  onNavigate,
}: {
  label: string;
  items: NavigationItem[];
  pathname: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {!isCollapsed && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-fg-quaternary">
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-ui-md px-3 text-sm font-semibold text-fg-secondary outline-none transition hover:bg-bg-secondary focus-visible:ring-[3px] focus-visible:ring-focus-ring",
                  active && "bg-brand-subtle text-brand-text",
                  isCollapsed && "justify-center px-2",
                  "[&>span>svg]:size-5",
                )}
              >
                <span aria-hidden="true" className="flex shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
