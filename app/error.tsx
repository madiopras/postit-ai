'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';

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
    <main className="ui-surface flex min-h-screen min-h-dvh items-center justify-center bg-bg-secondary p-6 text-fg-primary">
      <div className="w-full max-w-md rounded-ui-xl border border-border-secondary bg-bg-primary p-8 text-center shadow-ui-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-ui-xl bg-error-bg">
          <AlertTriangleIcon className="size-7 text-error-fg" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-semibold text-brand-text">PostIt AI</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-fg-primary">
          Terjadi kesalahan
        </h1>
        <p className="mt-2 text-sm leading-6 text-fg-tertiary">
          Halaman ini gagal dimuat. Coba lagi beberapa saat lagi.
        </p>
        {error.digest && (
          // The digest is the only handle on the server-side stack, which Next
          // deliberately does not send to the browser.
          <p className="mt-3 font-mono text-xs text-fg-quaternary">Kode: {error.digest}</p>
        )}
        <Button onPress={reset} iconLeading={<RefreshCwIcon />} className="mt-6">
          Coba lagi
        </Button>
      </div>
    </main>
  );
}
