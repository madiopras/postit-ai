import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('PWA & Service Worker configuration', () => {
  it('has valid manifest and icons in public directory', () => {
    expect(existsSync(join(process.cwd(), 'public/icons/icon-192.png'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'public/icons/icon-512.png'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'public/icons/icon-maskable-512.png'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'public/icons/apple-touch-icon.png'))).toBe(true);
  });

  it('verifies service worker bypasses /dashboard, /api, and dev routes', () => {
    const swPath = join(process.cwd(), 'public/sw.js');
    expect(existsSync(swPath)).toBe(true);

    const swContent = readFileSync(swPath, 'utf8');
    expect(swContent).toContain('/dashboard');
    expect(swContent).toContain('/api');
    expect(swContent).toContain('caches.open');
    expect(swContent.toLowerCase()).toContain('stale-while-revalidate');
  });
});
  it('verifies manifest metadata adheres to PWA installability requirements', () => {
    const manifestPath = join(process.cwd(), 'app/manifest.ts');
    expect(existsSync(manifestPath)).toBe(true);

    const manifestContent = readFileSync(manifestPath, 'utf8');
    expect(manifestContent).toContain('name: "PostIt AI');
    expect(manifestContent).toContain('short_name: "PostIt AI"');
    expect(manifestContent).toContain('start_url: "/"');
    expect(manifestContent).toContain('display: "standalone"');
    expect(manifestContent).toContain('theme_color: "#004b6b"');
    expect(manifestContent).toContain('purpose: "maskable"');
  });

  it('ensures service worker provides offline fallback for navigate mode on root route', () => {
    const swPath = join(process.cwd(), 'public/sw.js');
    const swContent = readFileSync(swPath, 'utf8');
    expect(swContent).toContain("request.mode === 'navigate'");
    expect(swContent).toContain("url.pathname === '/'");
    expect(swContent).toContain('Offline — PostIt AI');
  });


