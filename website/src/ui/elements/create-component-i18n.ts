/**
 * Factory for component-scoped i18n clients (defaults to app root parent).
 *
 * @module ui/elements/create-component-i18n
 */
import { createI18nClient, getAppLocale, type I18nLocaleBundles } from '../../i18n/index.js';

/**
 * Creates an i18n client scoped to a Lit component using the current app locale.
 *
 * The returned client resolves translation keys from the supplied locale bundles
 * and tracks the locale selected at the app root.
 *
 * @param bundles - Per-locale message bundles for the component's translation keys.
 * @returns An i18n client bound to {@link getAppLocale} and the given bundles.
 */
export function createComponentI18n(bundles: I18nLocaleBundles) {
  return createI18nClient({
    locale: getAppLocale(),
    bundles,
  });
}
