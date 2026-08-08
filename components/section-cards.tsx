'use client';

import { AlertTriangleIcon, BookOpenIcon, LayersIcon, MessageSquareIcon, ThumbsUpIcon } from 'lucide-react';
import { Badge, Skeleton } from '@/components/dashboard/dashboard-ui';
import type { DashboardStats } from '@/lib/stats';

/**
 * Overview KPIs using DaisyUI stats components.
 */
export function SectionCards({ stats }: { stats: DashboardStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card card-border bg-base-100 p-5 shadow-xs">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1 h-8 w-20" />
              <Skeleton className="mt-3 h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const knowledgeTotal = stats.faqs.total + stats.sops.total;
  const knowledgePublished = stats.faqs.published + stats.sops.published;
  const brokenSources = stats.faqs.error + stats.sops.error;

  const ratedPct =
    stats.feedback.rated > 0
      ? Math.round((stats.feedback.thumbsUp / stats.feedback.rated) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <StatCard
        label="Knowledge base"
        value={knowledgePublished}
        icon={<BookOpenIcon className="size-5 text-primary" />}
        badge={brokenSources > 0 ? { text: `${brokenSources} error`, tone: 'critical' } : undefined}
        footer={`${knowledgePublished} dari ${knowledgeTotal} entri published`}
        detail={`${stats.faqs.published} FAQ · ${stats.sops.published} SOP`}
      />

      <StatCard
        label="Chunk vektor"
        value={stats.documents.total}
        icon={<LayersIcon className="size-5 text-primary" />}
        badge={
          stats.documents.missingEmbedding > 0
            ? { text: `${stats.documents.missingEmbedding} tanpa vektor`, tone: 'critical' }
            : undefined
        }
        footer={`${stats.documents.embedded} sudah ter-embed`}
        detail={`${stats.documents.faq} dari FAQ · ${stats.documents.sop} dari SOP`}
      />

      <StatCard
        label="Percakapan"
        value={stats.conversations.total}
        icon={<MessageSquareIcon className="size-5 text-primary" />}
        footer={`${stats.conversations.last7Days} dalam 7 hari terakhir`}
        detail={`${stats.messages.total} pesan · ${stats.messages.assistant} jawaban AI`}
      />

      <StatCard
        label="Kepuasan"
        value={ratedPct === null ? '—' : `${ratedPct}%`}
        icon={<ThumbsUpIcon className="size-5 text-primary" />}
        footer={
          stats.feedback.rated === 0
            ? 'Belum ada penilaian'
            : `${stats.feedback.rated} jawaban dinilai`
        }
        detail={
          stats.feedback.rated === 0
            ? 'Tombol 👍/👎 di chat mengisi angka ini'
            : `${stats.feedback.thumbsUp} suka · ${stats.feedback.thumbsDown} tidak`
        }
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  badge,
  footer,
  detail,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  badge?: { text: string; tone: 'critical' };
  footer: string;
  detail: string;
}) {
  return (
    <div className="card card-border bg-base-100 shadow-xs">
      <div className="card-body p-5 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
            {icon}
            <span>{label}</span>
          </div>
          {badge && (
            <Badge variant="error" className="gap-1 text-xs">
              <AlertTriangleIcon className="size-3" />
              {badge.text}
            </Badge>
          )}
        </div>

        <div className="text-3xl font-bold tracking-tight text-base-content">
          {value}
        </div>

        <div className="border-t border-base-200 pt-3 text-xs flex flex-col gap-0.5">
          <span className="font-medium text-base-content">{footer}</span>
          <span className="text-base-content/60">{detail}</span>
        </div>
      </div>
    </div>
  );
}
