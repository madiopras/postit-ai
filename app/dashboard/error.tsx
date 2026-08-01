'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/dashboard/dashboard-ui';

/**
 * Dashboard-scoped boundary: keeps the sidebar and header mounted so a failed
 * page does not throw the admin out of the app entirely.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error);
  }, [error]);

  return (
    <Card className="mx-auto mt-8 w-full max-w-lg border-error-border bg-error-bg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangleIcon className="size-4 text-error-fg" />
          Halaman gagal dimuat
        </CardTitle>
        <CardDescription>
          Kemungkinan besar API tidak merespons atau database tidak terjangkau.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error.digest && (
          <p className="font-mono text-xs text-fg-tertiary">Kode: {error.digest}</p>
        )}
        <Button size="sm" onClick={reset}>
          <RefreshCwIcon className="mr-2 size-4" />
          Coba lagi
        </Button>
      </CardContent>
    </Card>
  );
}
