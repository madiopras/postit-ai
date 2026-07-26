'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Thin wrapper so the root layout can stay a server component.
 *
 * `next-themes` writes the `dark` class onto <html> before paint, which is what
 * the `.dark` block in globals.css keys off.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
