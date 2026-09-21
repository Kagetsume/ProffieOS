/**
 * Application-wide i18n client for strings shared across components.
 *
 * @module i18n/root
 */
import { registerRootClient } from './client-registry.js';
import { createRootI18nClient } from './create-client.js';
import enCommon from './locales/en/common.json';
import rootCommon from './locales/root/common.json';
import { DEFAULT_LOCALE, setAppLocale } from './resolve-locale.js';

export { DEFAULT_LOCALE } from './resolve-locale.js';

/**
 * Root client — parent of all component clients unless overridden.
 *
 * Bundle files live under `src/i18n/locales/<tag>/common.json`
 * (`en_US`, `en`, `root`, …).
 */
export const rootI18n = createRootI18nClient({
  locale: DEFAULT_LOCALE,
  bundles: {
    root: rootCommon,
    en: enCommon,
  },
});

registerRootClient(rootI18n);
setAppLocale(rootI18n.locale);
