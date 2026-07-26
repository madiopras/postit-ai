'use client';

import { useEffect, useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';

import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { SectionCards } from '@/components/section-cards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  useEffect(() => {
    let cancelled = false;

    fetch('/api/stats')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success) setStats(body.data);
        else setError(body.error?.message ?? 'Gagal memuat statistik');
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat statistik');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const needsAttention =
    stats &&
    (stats.documents.missingEmbedding > 0 ||
      stats.documents.error > 0 ||
      stats.faqs.error > 0 ||
      stats.sops.error > 0);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 md:gap-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ringkasan knowledge base dan aktivitas chatbot.
        </p>
      </div>

      {error && (
        <div className="px-4 lg:px-6">
          <Card className="border-destructive/40">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertTriangleIcon className="size-4" />
              {error}
            </CardContent>
          </Card>
        </div>
      )}

      <SectionCards stats={stats} />

      {needsAttention && (
        <div className="px-4 lg:px-6">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangleIcon className="size-4 text-destructive" />
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
              {/* This project's Button has no `asChild`, so the link wraps it. */}
              <Link href="/dashboard/documents?status=error" className="ml-auto">
                <Button size="sm" variant="outline">
                  Buka Documents
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive trend={stats?.trend ?? null} />
      </div>
    </div>
  );
}
