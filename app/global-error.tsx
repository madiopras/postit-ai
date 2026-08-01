'use client';

import { useEffect } from 'react';

/**
 * Last line of defence: an error thrown in the root layout itself, which
 * `app/error.tsx` cannot catch because it renders *inside* that layout.
 *
 * This one replaces <html>/<body>, so it cannot use the app's providers or
 * theme tokens — hence the inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global error]', error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: '1.5rem',
          background: '#f8f9ff',
          color: '#0b1c30',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <p style={{ color: '#444ce7', fontSize: '0.875rem', fontWeight: 600 }}>
            PostIt AI
          </p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Aplikasi gagal dimuat</h1>
          <p style={{ fontSize: '0.875rem', color: '#464555' }}>
            Terjadi kesalahan fatal saat memuat halaman.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#464555', fontFamily: 'monospace' }}>
              Kode: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#3525cd',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
