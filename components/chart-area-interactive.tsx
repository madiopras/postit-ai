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
          <div className="join border border-base-300 rounded-lg p-0.5 bg-base-200/50" role="group" aria-label="Rentang aktivitas">
            <button
              type="button"
              className={`btn btn-xs join-item ${range === '7' ? 'btn-neutral' : 'btn-ghost'}`}
              onClick={() => setRange('7')}
              aria-pressed={range === '7'}
            >
              7 hari
            </button>
            <button
              type="button"
              className={`btn btn-xs join-item ${range === '30' ? 'btn-neutral' : 'btn-ghost'}`}
              onClick={() => setRange('30')}
              aria-pressed={range === '30'}
            >
              30 hari
            </button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6">
        {!trend ? (
          <Skeleton className="h-[250px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center rounded-box border border-dashed border-base-300 text-sm text-base-content/60">
            Belum ada aktivitas chat pada rentang ini.
          </div>
        ) : (
          <div
            className="h-[250px] w-full"
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
                <CartesianGrid vertical={false} strokeOpacity={0.2} stroke="currentColor" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={isMobile ? 40 : 24}
                  tickFormatter={formatDay}
                  stroke="currentColor"
                  className="text-xs text-base-content/60"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  allowDecimals={false}
                  stroke="currentColor"
                  className="text-xs text-base-content/60"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '4 4', stroke: 'currentColor', opacity: 0.3 }}
                  labelFormatter={(value) =>
                    new Date(value as string).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                    })
                  }
                  contentStyle={{
                    background: 'var(--color-base-100, #1f2937)',
                    border: '1px solid var(--color-base-300, #374151)',
                    borderRadius: '0.5rem',
                    color: 'var(--color-base-content, #f3f4f6)',
                  }}
                />
                <Legend formatter={(value) => (value === 'messages' ? 'Pesan' : 'Percakapan')} />
                <Line
                  dataKey="messages"
                  type="monotone"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="chats"
                  type="monotone"
                  stroke="#f97316"
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
