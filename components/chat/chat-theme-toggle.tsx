'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';
import { toggleTheme } from '@/lib/theme';

export function ChatThemeToggle({ className }: { className?: string }) {
  return (
    <Button
      variant="tertiary"
      size="sm"
      onPress={toggleTheme}
      className={className}
      aria-label="Ganti tema terang/gelap"
    >
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <span className="sr-only">Ganti tema</span>
    </Button>
  );
}
