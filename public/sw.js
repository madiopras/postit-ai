const CACHE_NAME = 'postit-chat-v1';

// Static assets to precache for offline shell
const PRECACHE_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. BYPASS: Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. BYPASS: Never cache Admin Dashboard, APIs, or SSE streams
  if (
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return;
  }

  // 3. For navigation requests (opening pages)
  if (request.mode === 'navigate') {
    // Only intercept root / chat route
    if (url.pathname === '/') {
      event.respondWith(
        fetch(request).catch(async () => {
          const cached = await caches.match('/');
          if (cached) return cached;
          return new Response(
            `<!DOCTYPE html>
            <html lang="id">
            <head>
              <meta charset="utf-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1"/>
              <title>Offline — PostIt AI</title>
              <style>
                body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center; padding: 1.5rem; }
                .card { max-width: 400px; padding: 2rem; border-radius: 1rem; background: #1e293b; border: 1px solid #334155; }
                h1 { margin-top: 0; font-size: 1.25rem; color: #818cf8; }
                p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; }
                button { margin-top: 1rem; background: #4f46e5; color: #fff; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Koneksi Terputus</h1>
                <p>Anda sedang offline. Silakan periksa jaringan internet Anda untuk melanjutkan percakapan dengan PostIt AI.</p>
                <button onclick="window.location.reload()">Coba Muat Ulang</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
      );
    }
    return;
  }

  // 4. Stale-While-Revalidate for Static Assets (_next/static, icons, fonts)
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.startsWith('/avatars') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetched = fetch(request).then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => null);

        return cached || (await fetched) || new Response(null, { status: 404 });
      })
    );
  }
});
