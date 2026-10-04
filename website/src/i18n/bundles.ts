/**
 * Normalize locale bundle maps for lookup.
 *
 * @module i18n/bundles
 */
import { localeLookupChain, normalizeLocaleTag } from './locale-chain.js';
import { DEFAULT_LOCALE } from './resolve-locale.js';
import type { I18nLocaleBundles, I18nMessages } from './types.js';

export type NormalizedBundles = Readonly<Record<string, I18nMessages>>;

/** Normalize bundle keys (`en-US` → `en_US`); skip empty tables. */
export function normalizeBundles(bundles: I18nLocaleBundles): NormalizedBundles {
  const normalized: Record<string, I18nMessages> = {};

  for (const [rawKey, table] of Object.entries(bundles)) {
    if (!table) {
      continue;
    }
    const key = rawKey === 'root' ? 'root' : normalizeLocaleTag(rawKey);
    normalized[key] = table;
  }

  return normalized;
}

/** Tags to search for one key: locale chain, then `en`, then `root` (English canonical). */
export function bundleLookupTags(locale: string): string[] {
  const tags = [...localeLookupChain(normalizeLocaleTag(locale))];
  if (!tags.includes(DEFAULT_LOCALE)) {
    tags.push(DEFAULT_LOCALE);
  }
  tags.push('root');
  return tags;
}
