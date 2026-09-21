/**
 * i18n — JSON message files, `${variable}` substitution, DOMPurify sanitization,
 * and Intl-based `formatNumber` / `formatDate` helpers.
 *
 * Each component can ship its own `locales/<locale>.json` and a dedicated client:
 *
 * ```ts
 * // ui/elements/po-copy-panel.i18n.ts
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
