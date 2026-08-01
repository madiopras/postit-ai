'use client';

import { useEffect, useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';

import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { SectionCards } from '@/components/section-cards';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/dashboard/dashboard-ui';
import type { DashboardStats } from '@/lib/stats';
import Link from 'next/link';

/**
 * Dashboard overview.
 *
 * Renders inside app/dashboard/layout.tsx, which already provides the sidebar
 * and header. The previous version mounted its own SidebarProvider + AppSidebar
 * on top of the layout's, so this page showed two sidebars — and every figure on
 * it came from the shadcn dashboard-01 demo rather than the database.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/stats')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Gagal memuat statistik');
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        if (body.success) setStats(body.data);
        else setError(body.error?.message ?? 'Gagal memuat statistik');
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Gagal memuat statistik');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadVersion]);

  const needsAttention =
    stats &&
    (stats.documents.missingEmbedding > 0 ||
      stats.documents.error > 0 ||
      stats.faqs.error > 0 ||
      stats.sops.error > 0);

  return (
    <div className="@container/main flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ringkasan knowledge base dan aktivitas chatbot.
        </p>
      </div>

      {error && (
        <div>
          <Card role="alert" className="border-error-border bg-error-bg">
            <CardContent className="flex flex-col gap-3 py-4 text-sm text-error-fg sm:flex-row sm:items-center">
              <AlertTriangleIcon className="size-4" />
              {error}
              <Button
                variant="outline"
                size="sm"
                className="sm:ml-auto"
                onClick={() => {
                  setError(null);
                  setReloadVersion((value) => value + 1);
                }}
              >
                Coba lagi
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <SectionCards stats={stats} />

      {needsAttention && (
        <div>
          <Card className="border-error-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangleIcon className="size-4 text-error-fg" />
                Perlu perhatian
              </CardTitle>
              <CardDescription>
                Sebagian konten tidak masuk ke vector store, sehingga tidak akan pernah
                dipakai menjawab di chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4 text-sm">
              <ul className="text-muted-foreground list-inside list-disc space-y-1">
                {stats.documents.missingEmbedding > 0 && (
                  <li>{stats.documents.missingEmbedding} chunk tanpa vektor</li>
                )}
                {stats.documents.error > 0 && (
                  <li>{stats.documents.error} chunk berstatus error</li>
                )}
                {stats.faqs.error > 0 && <li>{stats.faqs.error} FAQ gagal di-embed</li>}
                {stats.sops.error > 0 && <li>{stats.sops.error} SOP gagal di-embed</li>}
              </ul>
              <Link
                href="/dashboard/documents?status=error"
                className="ml-auto inline-flex min-h-9 items-center rounded-ui-md border border-border-primary bg-bg-primary px-3 py-2 text-sm font-semibold text-fg-secondary shadow-ui-xs outline-none hover:bg-bg-secondary focus-visible:ring-[3px] focus-visible:ring-focus-ring"
              >
                Buka dokumen
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <ChartAreaInteractive trend={stats?.trend ?? null} />
      </div>
    </div>
  );
}
