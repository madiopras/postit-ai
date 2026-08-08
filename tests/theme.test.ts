import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyThemeMode,
  resolveThemeMode,
  THEME_STORAGE_KEY,
  toggleTheme,
} from '@/lib/theme';

function createMockRoot() {
  const classes = new Set<string>();

  return {
    classList: {
      toggle(className: string, force?: boolean) {
        if (force === undefined) {
          if (classes.has(className)) {
            classes.delete(className);
            return false;
          }

          classes.add(className);
          return true;
        }

        if (force) {
          classes.add(className);
        } else {
          classes.delete(className);
        }

        return force;
      },
      contains(className: string) {
        return classes.has(className);
      },
    },
    dataset: {} as { theme?: string },
    style: {} as { colorScheme?: string },
    classes,
  };
}

function installMockDocument(root: ReturnType<typeof createMockRoot>) {
  vi.stubGlobal('document', {
    documentElement: root,
  });
}

function installMockLocalStorage() {
  const storage = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    get length() {
      return storage.size;
    },
  });

  return storage;
}

describe('theme helpers', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves stored and system theme preferences', () => {
    expect(resolveThemeMode('dark', false)).toBe('dark');
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(resolveThemeMode(null, true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
  });

  it('applies the same theme to class, data-theme, and color-scheme', () => {
    const root = createMockRoot();
    installMockDocument(root);

    applyThemeMode('dark');

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('toggles the active theme and persists the selected mode', () => {
    const root = createMockRoot();
    root.dataset.theme = 'light';
    installMockDocument(root);
    const storage = installMockLocalStorage();

    toggleTheme();

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(storage.get(THEME_STORAGE_KEY)).toBe('dark');

    toggleTheme();

    expect(root.classList.contains('dark')).toBe(false);
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    expect(storage.get(THEME_STORAGE_KEY)).toBe('light');
  });
});