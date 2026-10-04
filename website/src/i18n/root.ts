/**
 * Application-wide i18n client for strings shared across components.
 *
 * @module i18n/root
 */
import { registerRootClient } from './client-registry.js';
import { createRootI18nClient } from './create-client.js';
import { applyDocumentLocale, resolveInitialAppLocale } from './locale-preference.js';
import { buildRootLocaleBundles } from './root-bundles.js';
import { setAppLocale } from './resolve-locale.js';

export { DEFAULT_LOCALE } from './resolve-locale.js';

/**
 * Root client — parent of all component clients unless overridden.
 *
 * Bundle files live under `src/i18n/locales/<tag>/common.json`
 * (`en`, `fr`, `zh_Hans`, `root`, …).
 */
const initialLocale = resolveInitialAppLocale();

export const rootI18n = createRootI18nClient({
  locale: initialLocale,
  bundles: buildRootLocaleBundles(),
});

registerRootClient(rootI18n);
setAppLocale(rootI18n.locale);
applyDocumentLocale(rootI18n.locale);
