/**
 * Supported UI locales and regional aliases for bundle lookup.
 *
 * @module i18n/supported-locales
 */
import { localeLookupChain } from './locale-chain.js';
import { DEFAULT_LOCALE } from './resolve-locale.js';
import type { I18nLocaleBundles, LocaleId } from './types.js';

/** Primary locale tags with full LayerBlade UI translations. */
export const SUPPORTED_LOCALES = [
  'en',
  'fr',
  'es',
  'de',
  'ja',
  'zh_Hans',
  'zh_Hant',
] as const satisfies readonly LocaleId[];

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Map browser/regional tags to primary bundle tags.
 * Example: `zh-CN` → `zh_CN` normalizes to bundle key `zh_CN` → `zh_Hans` messages.
 */
export const LOCALE_ALIASES: Readonly<Record<string, LocaleId>> = {
  zh_CN: 'zh_Hans',
  zh_TW: 'zh_Hant',
};

const supportedSet = new Set<string>(SUPPORTED_LOCALES);

/**
 * Pick the best supported UI locale for a browser or user tag.
 * Uses {@link LOCALE_ALIASES} (e.g. `zh_CN` → `zh_Hans`) then {@link localeLookupChain}.
 */
export function resolveSupportedAppLocale(candidate: LocaleId): SupportedLocale | typeof DEFAULT_LOCALE {
  const normalized = candidate.trim().replace(/-/g, '_');
  if (!normalized) {
    return DEFAULT_LOCALE;
  }

  const candidates: LocaleId[] = [];
  const alias = LOCALE_ALIASES[normalized];
  if (alias) {
    candidates.push(alias);
  }
  const parts = normalized.split('_').filter(Boolean);
  if (parts[0] === 'zh') {
    if (parts.includes('Hans')) {
      candidates.push('zh_Hans');
    }
    if (parts.includes('Hant')) {
      candidates.push('zh_Hant');
    }
  }
  candidates.push(...localeLookupChain(normalized));

  for (const tag of candidates) {
    if (supportedSet.has(tag)) {
      return tag as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

/** Duplicate alias bundle tables so regional tags resolve without extra JSON files. */
export function applyLocaleAliases(bundles: I18nLocaleBundles): I18nLocaleBundles {
  const out: I18nLocaleBundles = { ...bundles };

  for (const [alias, target] of Object.entries(LOCALE_ALIASES)) {
    const table = out[target];
    if (table && !out[alias]) {
      out[alias] = table;
    }
  }

  return out;
}
