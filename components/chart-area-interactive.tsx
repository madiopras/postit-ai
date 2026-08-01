'use client';

import * as React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/dashboard/dashboard-ui';
import type { TrendPoint } from '@/lib/stats';

/**
 * Activity over time.
 *
 * Form: change-over-time with two series in the same unit (counts), so one
 * y-axis carries both — never a second axis. Lines rather than stacked areas,
 * because the two are related but not parts of a whole; stacking would imply
 * chats + messages sums to something meaningful.
 *
 * Colors are categorical slots 1 and 2 (blue, orange), validated against this
 * project's card surfaces in both modes: CVD ΔE 24.7 light / 26.8 dark and
 * normal-vision ΔE 33.6 / 31.8, well clear of the floors. Not the project's own
 * --chart-N tokens, which are greyscale (chroma 0); and the demo this replaced
 * gave both series var(--primary), i.e. the same color twice.
 */
export function ChartAreaInteractive({ trend }: { trend: TrendPoint[] | null }) {
  const isMobile = useIsMobile();
  const [range, setRange] = React.useState<'7' | '30'>('30');

  const data = React.useMemo(() => {
    if (!trend) return [];
    return range === '7' ? trend.slice(-7) : trend;
  }, [trend, range]);

  const totals = React.useMemo(
    () =>
      data.reduce(
        (acc, p) => ({ chats: acc.chats + p.chats, messages: acc.messages + p.messages }),
        { chats: 0, messages: 0 }
      ),
    [data]
  );

  const formatDay = (value: string) =>
    new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Aktivitas chat</CardTitle>
        <CardDescription>
          {totals.messages} pesan dari {totals.chats} percakapan dalam {range} hari terakhir
        </CardDescription>
        <CardAction>
          <div className="flex rounded-ui-md border border-border-primary bg-bg-primary p-0.5" aria-label="Rentang aktivitas">
            <Button
              variant={range === '7' ? 'secondary' : 'ghost'}
              size="sm"
              className="min-h-8 border-0 px-2.5 shadow-none"
              onClick={() => setRange('7')}
              aria-pressed={range === '7'}
            >
              7 hari
            </Button>
            <Button
              variant={range === '30' ? 'secondary' : 'ghost'}
              size="sm"
              className="min-h-8 border-0 px-2.5 shadow-none"
              onClick={() => setRange('30')}
              aria-pressed={range === '30'}
            >
              30 hari
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6">
        {!trend ? (
          <Skeleton className="h-62.5 w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-62.5 items-center justify-center rounded-ui-lg border border-dashed border-border-primary text-sm text-fg-tertiary">
            Belum ada aktivitas chat pada rentang ini.
          </div>
        ) : (
          <div
            className="h-62.5 w-full"
            role="img"
            aria-label={`Grafik ${totals.messages} pesan dan ${totals.chats} percakapan dalam ${range} hari terakhir`}
          >
            <ResponsiveContainer
              width="100%"
              height={250}
              minWidth={0}
              initialDimension={{ width: 800, height: 250 }}
            >
              <LineChart data={data} margin={{ left: 4, right: 12, top: 4, bottom: 0 }}>
              {/* Recessive grid: horizontal only, so it reads as a reference
                  surface rather than competing with the lines. */}
              <CartesianGrid vertical={false} strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={isMobile ? 40 : 24}
                tickFormatter={formatDay}
              />
              <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip
                cursor={{ strokeDasharray: '4 4' }}
                labelFormatter={(value) =>
                  new Date(value as string).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                  })
                }
                contentStyle={{
                  background: 'var(--ui-bg-primary)',
                  border: '1px solid var(--ui-border-secondary)',
                  borderRadius: 'var(--ui-radius-md)',
                  color: 'var(--ui-fg-primary)',
                }}
              />
              {/* Two series, so a legend is always present — identity is never
                  carried by color alone. */}
              <Legend formatter={(value) => (value === 'messages' ? 'Pesan' : 'Percakapan')} />
              <Line
                dataKey="messages"
                type="monotone"
                stroke="var(--ui-chart-1)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4 }}
              />
              <Line
                dataKey="chats"
                type="monotone"
                stroke="var(--ui-chart-2)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4 }}
              />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
