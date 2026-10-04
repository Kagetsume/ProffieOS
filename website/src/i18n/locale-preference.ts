/**
 * Persisted UI locale override (`localStorage`) and startup resolution.
 *
 * @module i18n/locale-preference
 */
import { detectBrowserLocale, normalizeLocaleTag, toIntlLocaleTag } from './locale-chain.js';
import { DEFAULT_LOCALE } from './resolve-locale.js';
import { resolveSupportedAppLocale, type SupportedLocale } from './supported-locales.js';
import type { LocaleId } from './types.js';

/** `localStorage` key for the user's explicit language choice. */
export const LOCALE_STORAGE_KEY = 'layerblade.locale';

/** Read a stored locale tag, or `null` when unset. */
export function getStoredAppLocale(): LocaleId | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)?.trim();
  return stored ? normalizeLocaleTag(stored) : null;
}

/** Persist the user's locale override. */
export function setStoredAppLocale(locale: LocaleId): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocaleTag(locale));
}

/** Stored override when set; otherwise browser locale mapped to a supported tag. */
export function resolveInitialAppLocale(): SupportedLocale | typeof DEFAULT_LOCALE {
  const stored = getStoredAppLocale();
  if (stored) {
    return resolveSupportedAppLocale(stored);
  }
  return resolveSupportedAppLocale(detectBrowserLocale());
}

/** Sync `<html lang>` with the active UI locale. */
export function applyDocumentLocale(locale: LocaleId): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = toIntlLocaleTag(locale);
}
