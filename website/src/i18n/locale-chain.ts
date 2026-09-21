/**
 * Locale tag normalization and bundle lookup order.
 *
 * @module i18n/locale-chain
 */
import { DEFAULT_LOCALE } from './resolve-locale.js';
import type { LocaleId } from './types.js';

/** Normalize BCP 47 tags to `language_REGION` (e.g. `en-US` → `en_US`). */
export function normalizeLocaleTag(locale: string): LocaleId {
  return locale.trim().replace(/-/g, '_');
}

/** Convert stored bundle tags to BCP 47 for `Intl` formatters. */
export function toIntlLocaleTag(locale: LocaleId): string {
  const normalized = normalizeLocaleTag(locale);
  const parts = normalized.split('_').filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] ?? DEFAULT_LOCALE;
  }
  return `${parts[0]}-${parts.slice(1).join('-')}`;
}

/**
 * Bundle lookup order for a locale.
 *
 * Example: `en_US` → `['en_US', 'en']`, then callers append `'root'`.
 */
export function localeLookupChain(locale: LocaleId): LocaleId[] {
  const normalized = normalizeLocaleTag(locale);
  const parts = normalized.split('_').filter(Boolean);
  if (parts.length === 0) {
    return [];
  }
  const language = parts[0]!;
  if (parts.length === 1) {
    return [language];
  }
  return [normalized, language];
}

/** Read the browser locale, normalized for bundle file names. */
export function detectBrowserLocale(): LocaleId {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }
  const candidate = navigator.language?.trim();
  return candidate ? normalizeLocaleTag(candidate) : DEFAULT_LOCALE;
}
