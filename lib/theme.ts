export const THEME_STORAGE_KEY = 'postit_theme';

export type ThemeMode = 'light' | 'dark';

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function resolveThemeMode(
  storedTheme: string | null,
  prefersDark: boolean,
): ThemeMode {
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return prefersDark ? 'dark' : 'light';
}

export function applyThemeMode(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function getCurrentThemeMode(): ThemeMode {
  const rootTheme = document.documentElement.dataset.theme;

  if (isThemeMode(rootTheme)) {
    return rootTheme;
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Applies the saved (or system) theme to <html> before first paint.
 *
 * Rendered as an inline script from the server layout, where a <script> is
 * legitimate and actually executes. next-themes rendered its equivalent from
 * inside a client component, which React 19 warns about ("Scripts inside React
 * components are never executed when rendering on the client").
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
r.classList.toggle('dark',d);
r.dataset.theme=d?'dark':'light';
r.style.colorScheme=d?'dark':'light';
}catch(e){}})();`;

/** Toggle the shared root theme from a client-side control. */
export function toggleTheme(): void {
  const nextTheme = getCurrentThemeMode() === 'dark' ? 'light' : 'dark';

  applyThemeMode(nextTheme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Storage blocked (private mode) — the theme still applies for this page.
  }
}
