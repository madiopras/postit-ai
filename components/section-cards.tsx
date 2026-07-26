'use client';

import { AlertTriangleIcon, BookOpenIcon, LayersIcon, MessageSquareIcon, ThumbsUpIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardStats } from '@/lib/stats';

/**
 * Overview KPIs.
 *
 * These are stat tiles, not charts: each answers a single "how many" with no
 * trend to plot, so a bare number carries it. Every figure comes from
 * /api/stats — this file previously shipped the shadcn demo's invented
 * "$1,250.00 / 1,234 / 45,678 / 4.5%".
 */
export function SectionCards({ stats }: { stats: DashboardStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-8 w-20" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-40" />
            </CardFooter>
          </Card>
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
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <StatCard
        label="Knowledge base"
        value={knowledgePublished}
        icon={<BookOpenIcon className="size-4" />}
        badge={brokenSources > 0 ? { text: `${brokenSources} error`, tone: 'critical' } : undefined}
        footer={`${knowledgePublished} dari ${knowledgeTotal} entri published`}
        detail={`${stats.faqs.published} FAQ · ${stats.sops.published} SOP`}
      />

      <StatCard
        label="Chunk vektor"
        value={stats.documents.total}
        icon={<LayersIcon className="size-4" />}
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
        icon={<MessageSquareIcon className="size-4" />}
        footer={`${stats.conversations.last7Days} dalam 7 hari terakhir`}
        detail={`${stats.messages.total} pesan · ${stats.messages.assistant} jawaban AI`}
      />

      <StatCard
        label="Kepuasan"
        value={ratedPct === null ? '—' : `${ratedPct}%`}
        icon={<ThumbsUpIcon className="size-4" />}
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
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">{value}</CardTitle>
        {badge && (
          <CardAction>
            {/* Status is never carried by color alone — icon + label travel with it. */}
            <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
              <AlertTriangleIcon className="size-3" />
              {badge.text}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="font-medium">{footer}</div>
        <div className="text-muted-foreground">{detail}</div>
      </CardFooter>
    </Card>
  );
}
