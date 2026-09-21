/**
 * Factory for component-scoped i18n clients (defaults to app root parent).
 *
 * @module ui/elements/create-component-i18n
 */
import { createI18nClient, getAppLocale, type I18nLocaleBundles } from '../../i18n/index.js';

/** Create a component i18n client using the current app locale. */
export function createComponentI18n(bundles: I18nLocaleBundles) {
  return createI18nClient({
    locale: getAppLocale(),
    bundles,
  });
}
