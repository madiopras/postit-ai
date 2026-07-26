'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Catches render and data errors anywhere under app/ that no closer boundary
 * handles. Without this, an unhandled error left the visitor on a blank page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="bg-destructive/10 mx-auto flex size-14 items-center justify-center rounded-xl">
          <AlertTriangleIcon className="text-destructive size-7" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Terjadi kesalahan</h1>
        <p className="text-muted-foreground text-sm">
          Halaman ini gagal dimuat. Coba lagi — jika terus terjadi, periksa log server.
        </p>
        {error.digest && (
          // The digest is the only handle on the server-side stack, which Next
          // deliberately does not send to the browser.
          <p className="text-muted-foreground font-mono text-xs">Kode: {error.digest}</p>
        )}
        <Button onClick={reset}>
          <RefreshCwIcon className="mr-2 size-4" />
          Coba lagi
        </Button>
      </div>
    </div>
  );
}
