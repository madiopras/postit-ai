'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

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
    <main className="flex min-h-screen min-h-dvh items-center justify-center bg-base-200/50 p-6 text-base-content">
      <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-8 text-center shadow-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-error/10 text-error">
          <AlertTriangleIcon className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-bold text-primary">PostIt AI</p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-base-content">
          Terjadi kesalahan
        </h1>
        <p className="mt-2 text-sm leading-6 text-base-content/70">
          Halaman ini gagal dimuat. Coba lagi beberapa saat lagi.
        </p>
        {error.digest && (
          // The digest is the only handle on the server-side stack, which Next
          // deliberately does not send to the browser.
          <p className="mt-3 font-mono text-xs text-base-content/50">Kode: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary btn-sm mt-6 gap-2"
        >
          <RefreshCwIcon className="size-4" />
          <span>Coba lagi</span>
        </button>
      </div>
    </main>
  );
}
