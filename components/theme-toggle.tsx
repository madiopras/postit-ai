'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

/**
 * Light/dark switch.
 *
 * `resolvedTheme` is undefined during SSR and the first client render, and
 * next-themes fills it in itself — so the usual `mounted` flag (a setState
 * inside an effect, which React Compiler flags) is unnecessary. Until it
 * resolves, a same-sized blank keeps the header from shifting.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const resolved = resolvedTheme !== undefined;
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
    >
      {!resolved ? (
        <span className="size-4" />
      ) : isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </Button>
  );
}
