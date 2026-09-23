/**
 * Theme preference — persists dark mode in localStorage and applies `wa-dark` on `<html>`.
 *
 * @module ui/theme
 */

const STORAGE_KEY = 'po-theme';

export type ThemePreference = 'light' | 'dark';

/** Reads stored theme or `null` when unset (follow system). */
export function getStoredTheme(): ThemePreference | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

/** Resolves the effective theme from storage or `prefers-color-scheme`. */
export function resolveTheme(): ThemePreference {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/** Applies theme class on the document root. */
export function applyTheme(theme: ThemePreference): void {
  document.documentElement.classList.toggle('wa-dark', theme === 'dark');
}

/** Persists and applies the given theme. */
export function setTheme(theme: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Toggles between light and dark, persists the choice. */
export function toggleTheme(): ThemePreference {
  const next: ThemePreference = resolveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Applies stored or system theme — call once at startup before paint when possible. */
export function initTheme(): ThemePreference {
  const theme = resolveTheme();
  applyTheme(theme);
  return theme;
}
