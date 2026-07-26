'use client';

import { MoonIcon, SunIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { THEME_STORAGE_KEY } from '@/lib/theme';

/**
 * Light/dark switch.
 *
 * Both icons are always rendered and CSS picks one off the `dark` class, so the
 * server and client produce identical markup. Choosing the icon in JS caused a
 * hydration mismatch: the inline theme script runs before React hydrates, so the
 * client already knew the theme while the server had rendered a placeholder.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Storage blocked (private mode) — the theme still applies for this page.
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      // Static label: deriving it from the theme would reintroduce the mismatch.
      aria-label="Ganti tema terang/gelap"
      title="Ganti tema"
    >
      <MoonIcon className="size-4 dark:hidden" />
      <SunIcon className="size-4 hidden dark:block" />
    </Button>
  );
}
