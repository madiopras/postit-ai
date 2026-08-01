'use client';

import { MoonIcon, SunIcon } from 'lucide-react';

import { Button } from '@/components/untitled/base/buttons/button';
import { toggleTheme } from '@/lib/theme';

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
    <Button
      variant="tertiary"
      size="sm"
      className={`size-9 min-h-9 px-2 ${className ?? ''}`}
      onPress={toggleTheme}
      // Static label: deriving it from the theme would reintroduce the mismatch.
      aria-label="Ganti tema terang/gelap"
    >
      <MoonIcon className="size-4 dark:hidden" />
      <SunIcon className="size-4 hidden dark:block" />
    </Button>
  );
}
