/**
 * Normalize locale bundle maps for lookup.
 *
 * @module i18n/bundles
 */
import { normalizeLocaleTag } from './locale-chain.js';
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

/** Tags to search for one key: `en_US`, `en`, then `root`. */
export function bundleLookupTags(locale: string): string[] {
  const normalized = normalizeLocaleTag(locale);
  const parts = normalized.split('_').filter(Boolean);
  const tags: string[] = [];

  if (parts.length > 1) {
    tags.push(normalized);
  }
  if (parts.length >= 1) {
    tags.push(parts[0]!);
  }
  tags.push('root');

  return tags;
}
