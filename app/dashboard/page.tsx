'use client';

import { useEffect, useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';

import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { SectionCards } from '@/components/section-cards';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/dashboard/dashboard-ui';
import type { DashboardStats } from '@/lib/stats';

/**
 * Dashboard overview.
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
        <h1 className="text-2xl font-bold tracking-tight text-base-content">Overview</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Ringkasan knowledge base dan aktivitas chatbot.
        </p>
      </div>

      {error && (
        <div>
          <div role="alert" className="alert alert-error">
            <AlertTriangleIcon className="size-5" />
            <span className="text-sm">{error}</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setError(null);
                setReloadVersion((value) => value + 1);
              }}
            >
              Coba lagi
            </Button>
          </div>
        </div>
      )}

      <SectionCards stats={stats} />

      {needsAttention && (
        <div>
          <Card className="border-error/40 bg-error/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-error">
                <AlertTriangleIcon className="size-5" />
                Perlu perhatian
              </CardTitle>
              <CardDescription>
                Sebagian konten tidak masuk ke vector store, sehingga tidak akan pernah
                dipakai menjawab di chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4 text-sm">
              <ul className="list-inside list-disc space-y-1 text-base-content/70">
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
                className="btn btn-neutral btn-sm ml-auto"
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
