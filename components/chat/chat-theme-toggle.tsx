'use client';

import { Moon, Sun } from 'lucide-react';
import { toggleTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ChatThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'btn btn-ghost btn-sm btn-square rounded-xl text-base-content/75 transition-colors hover:bg-base-200 hover:text-primary',
        className
      )}
      aria-label="Ganti tema terang/gelap"
      title="Ganti tema terang/gelap"
    >
      <Moon className="size-4.5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4.5 dark:block" aria-hidden="true" />
      <span className="sr-only">Ganti tema</span>
    </button>
  );
}
