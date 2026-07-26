'use client';

import * as React from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
const chartConfig = {
  messages: {
    label: 'Pesan',
    theme: { light: '#2a78d6', dark: '#3987e5' },
  },
  chats: {
    label: 'Percakapan',
    theme: { light: '#eb6834', dark: '#d95926' },
  },
} satisfies ChartConfig;

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
          {/* Base UI's ToggleGroup is multi-value by design: it takes and
              returns an array even when only one item may be selected. */}
          <ToggleGroup
            value={[range]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === '7' || next === '30') setRange(next);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="7" aria-label="Tampilkan 7 hari terakhir">
              7 hari
            </ToggleGroupItem>
            <ToggleGroupItem value="30" aria-label="Tampilkan 30 hari terakhir">
              30 hari
            </ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6">
        {!trend ? (
          <Skeleton className="h-62.5 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-62.5 w-full">
            <LineChart data={data} margin={{ left: 4, right: 12, top: 4 }}>
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
              <ChartTooltip
                cursor={{ strokeDasharray: '4 4' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value as string).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                      })
                    }
                  />
                }
              />
              {/* Two series, so a legend is always present — identity is never
                  carried by color alone. */}
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="messages"
                type="monotone"
                stroke="var(--color-messages)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                dataKey="chats"
                type="monotone"
                stroke="var(--color-chats)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
