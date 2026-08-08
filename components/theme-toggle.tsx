'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { toggleTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * Light/dark switch.
 *
 * Both icons are always rendered and CSS picks one off the `dark` class, so the
 * server and client produce identical markup. Choosing the icon in JS caused a
 * hydration mismatch: the inline theme script runs before React hydrates, so the
 * client already knew the theme while the server had rendered a placeholder.
 */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn('btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-base-content', className)}
      onClick={toggleTheme}
      // Static label: deriving it from the theme would reintroduce the mismatch.
      aria-label="Ganti tema terang/gelap"
    >
      <MoonIcon className="size-4.5 dark:hidden" />
      <SunIcon className="size-4.5 hidden dark:block" />
      <span className="sr-only">Ganti tema</span>
    </button>
  );
}
