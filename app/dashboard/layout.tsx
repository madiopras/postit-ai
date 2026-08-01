"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/dashboard/dashboard-ui";
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
    <div className="ui-surface flex min-h-dvh bg-bg-secondary text-fg-primary">
      <a
        href="#dashboard-main"
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-ui-md bg-brand-solid px-3 py-2 text-sm font-semibold text-fg-on-brand focus:translate-y-0"
      >
        Lewati ke konten utama
      </a>

      <AppSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onMobileOpenChange={setIsMobileOpen}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border-secondary bg-bg-primary/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Buka navigasi dashboard"
          >
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={isCollapsed ? "Perluas navigasi" : "Ciutkan navigasi"}
            aria-pressed={isCollapsed}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </Button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              {segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join("/")}`;
                const isLast = index === segments.length - 1;
                const label = LABELS[segment] ?? (index > 1 ? "Detail" : segment);
                return (
                  <li key={href} className="flex min-w-0 items-center gap-2">
                    {index > 0 && <span aria-hidden="true" className="text-fg-quaternary">/</span>}
                    {isLast ? (
                      <span aria-current="page" className="truncate font-semibold text-fg-primary">
                        {label}
                      </span>
                    ) : (
                      <Link href={href} className="truncate text-fg-tertiary hover:text-fg-primary">
                        {label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
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
