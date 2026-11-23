"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const LABELS: Record<string, string> = {
  dashboard: "Ringkasan",
  faq: "FAQ",
  sop: "SOP",
  documents: "Dokumen",
  users: "Pengguna",
  admins: "Admin",
  config: "Konfigurasi AI",
  "audit-logs": "Log audit",
  new: "Baru",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const segments = pathname.split("/").filter(Boolean);

  return (
    <div className="relative flex min-h-dvh bg-base-100 text-base-content">
      <div
        className="utarasu-ulos-bar pointer-events-none fixed inset-x-0 top-0 z-50 h-[2.5px]"
        aria-hidden="true"
      />
      <a
        href="#dashboard-main"
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-content shadow-md transition-transform focus:translate-y-0"
      >
        Lewati ke konten utama
      </a>

      <AppSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onMobileOpenChange={setIsMobileOpen}
      />

      <div className="min-w-0 flex-1 bg-base-200/40">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-base-300/75 bg-base-100/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm md:hidden"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Buka navigasi dashboard"
          >
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm hidden md:inline-flex"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={isCollapsed ? "Perluas navigasi" : "Ciutkan navigasi"}
            aria-pressed={isCollapsed}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </button>

          <nav aria-label="Breadcrumb" className="breadcrumbs min-w-0 text-sm py-0">
            <ul className="flex min-w-0 items-center">
              {segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join("/")}`;
                const isLast = index === segments.length - 1;
                const label = LABELS[segment] ?? (index > 1 ? "Detail" : segment);
                return (
                  <li key={href}>
                    {isLast ? (
                      <span aria-current="page" className="truncate font-semibold text-base-content">
                        {label}
                      </span>
                    ) : (
                      <Link href={href} className="truncate text-base-content/60 hover:text-base-content">
                        {label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <ThemeToggle className="ml-auto" />
        </header>

        <main
          id="dashboard-main"
          className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
