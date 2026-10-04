/**
 * i18n — JSON message files, `${variable}` substitution, DOMPurify sanitization,
 * and Intl-based `formatNumber` / `formatDate` helpers.
 *
 * Each component can ship its own `locales/<locale>.json` and a dedicated client:
 *
 * ```ts
 * // ui/elements/lb-copy-panel.i18n.ts
 * import en from './locales/en.json';
 * import enUs from './locales/en_US.json';
 * import root from './locales/root.json';
 * import { createI18nClient, detectBrowserLocale } from '../../i18n';
 *
 * export const copyPanelI18n = createI18nClient({
 *   locale: detectBrowserLocale(),
 *   bundles: { root, en, en_US: enUs },
 * });
 * ```
 *
 * @module i18n
 */
export { I18nClient } from './client.js';
export { createI18nClient, createRootI18nClient } from './create-client.js';
export {
  detectBrowserLocale,
  localeLookupChain,
  normalizeLocaleTag,
  toIntlLocaleTag,
} from './locale-chain.js';
export { formatDate } from './format-date.js';
export { formatNumber } from './format-number.js';
export { DEFAULT_LOCALE, getAppLocale, resolveLocale, setAppLocale } from './resolve-locale.js';
export { sanitizeI18nString } from './sanitize.js';
export { applySubstitutions } from './substitute.js';
export { rootI18n } from './root.js';
export { buildRootLocaleBundles } from './root-bundles.js';
export {
  getStoredAppLocale,
  LOCALE_STORAGE_KEY,
  resolveInitialAppLocale,
  setStoredAppLocale,
} from './locale-preference.js';
export { PO_APP_LOCALE_CHANGE, switchAppLocale } from './switch-app-locale.js';
export {
  SUPPORTED_LOCALES,
  LOCALE_ALIASES,
  applyLocaleAliases,
  resolveSupportedAppLocale,
  type SupportedLocale,
} from './supported-locales.js';
export { commonKeys } from './common-keys.js';
export type {
  DateFormatLength,
  DateFormatPart,
  FormatDateOptions,
  FormatNumberOptions,
  I18nClientOptions,
  I18nLocaleBundles,
  I18nMessages,
  LocaleId,
  LocaleSource,
  SubstitutionMap,
} from './types.js';
