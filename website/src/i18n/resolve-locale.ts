/**
 * Resolve the active locale for Intl formatters.
 *
 * @module i18n/resolve-locale
 */
import { toIntlLocaleTag } from './locale-chain.js';
import type { LocaleId, LocaleSource } from './types.js';

/** Default locale until a locale picker / store is wired up. */
export const DEFAULT_LOCALE: LocaleId = 'en';

/** Application-wide locale for standalone format helpers. */
let appLocale: LocaleId = DEFAULT_LOCALE;

/** Current app locale used when no override or client is passed. */
export function getAppLocale(): LocaleId {
  return appLocale;
}

/** Sync app locale after loading a language or switching {@link rootI18n}. */
export function setAppLocale(locale: LocaleId): void {
  appLocale = locale;
}

/** Pick locale from explicit override, client, or the active app locale. */
export function resolveLocale(source?: LocaleSource): LocaleId {
  const tag = source?.locale ?? source?.client?.locale ?? appLocale;
  return toIntlLocaleTag(tag);
}
