"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

import { useCurrentUser } from "@/hooks/use-current-user";
import { PostItLogo } from "@/components/brand/postit-logo";
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
      {/* Desktop Sidebar */}
      <aside
        aria-label="Navigasi dashboard"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-base-200/60 bg-base-100/70 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/60 transition-[width] duration-200 md:flex",
          isCollapsed ? "w-20" : "w-[280px]",
        )}
      >
        <SidebarContent identity={identity} isCollapsed={isCollapsed} />
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => onMobileOpenChange(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-[280px] max-w-[80vw] flex-1 flex-col overflow-hidden border-r border-base-200/60 bg-base-100/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/70">
            <div className="absolute right-3 top-4 z-10">
              <button
                type="button"
                className="btn btn-ghost btn-circle btn-sm"
                onClick={() => onMobileOpenChange(false)}
                aria-label="Tutup navigasi dashboard"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              identity={identity}
              isCollapsed={false}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </div>
      )}
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
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_70%)]" />
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn(
          "relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-base-200/60 bg-base-100/45 px-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.35)] outline-none backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/35 focus-visible:ring-2 focus-visible:ring-primary",
          isCollapsed && "justify-center px-3",
        )}
        aria-label={isCollapsed ? "PostIt AI Admin" : undefined}
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-base-300/60 bg-base-100/85 shadow-sm ring-1 ring-black/5">
          <PostItLogo size={36} className="size-9" />
        </span>
        {!isCollapsed && (
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-base-content">PostIt AI</span>
            <span className="block truncate text-xs text-base-content/60">Admin dashboard</span>
          </span>
        )}
      </Link>

      <nav className="relative z-10 flex-1 space-y-6 overflow-y-auto p-3" aria-label="Menu utama">
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

      <div className="relative z-10 border-t border-base-200/60 bg-base-100/35 p-3 backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/25">
        {user ? (
          <div className={cn("dropdown dropdown-top w-full", isCollapsed ? "dropdown-end" : "")}>
            <div
              tabIndex={0}
              role="button"
              className={cn(
                "btn btn-ghost w-full justify-start gap-2.5 px-2 font-normal",
                isCollapsed && "justify-center px-0",
              )}
              aria-label={`Buka menu profil ${name}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {name.charAt(0).toLocaleUpperCase("id-ID")}
              </span>
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-base-content">{name}</span>
                    <span className="block truncate text-xs text-base-content/60">@{user.username}</span>
                  </span>
                  <ChevronDown className="size-4 text-base-content/40" aria-hidden="true" />
                </>
              )}
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu z-50 mb-2 w-60 rounded-box border border-base-200/60 bg-base-100/85 p-2 shadow-xl backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/70"
            >
              <li className="menu-title px-2 py-1.5">
                <span className="truncate text-sm font-semibold text-base-content">{name}</span>
                <span className="truncate text-xs font-normal text-base-content/60">@{user.username}</span>
                <span className="mt-1 badge badge-xs badge-neutral">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </span>
              </li>
              <div className="divider my-1"></div>
              <li>
                <button
                  type="button"
                  disabled={identity.logoutPending}
                  onClick={() => void identity.logout()}
                  className="flex items-center gap-2 text-error hover:bg-error/10 hover:text-error"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {identity.logoutPending ? "Keluar..." : "Keluar"}
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div
            className="skeleton h-11 w-full rounded-lg"
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
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-base-content/50">
          {label}
        </p>
      )}
      <ul className="menu menu-sm w-full gap-0.5 p-0">
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
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-content font-semibold shadow-sm"
                    : "text-base-content/80 hover:bg-base-200/70 hover:text-base-content",
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
