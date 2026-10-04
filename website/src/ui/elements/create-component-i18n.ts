/**
 * Factory for component-scoped i18n clients (defaults to app root parent).
 *
 * @module ui/elements/create-component-i18n
 */
import {
  applyLocaleAliases,
  createI18nClient,
  getAppLocale,
  type I18nLocaleBundles,
  type I18nMessages,
} from '../../i18n/index.js';

const localeModules = import.meta.glob('./locales/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, I18nMessages>;

const localeFilePattern = /^\.\/locales\/(.+)\.([^.]+)\.json$/;

/**
 * Load every `locales/<stem>.<locale>.json` table for one component.
 *
 * @param stem - File stem (e.g. `lb-app-shell`)
 */
export function bundlesForComponent(stem: string): I18nLocaleBundles {
  const bundles: I18nLocaleBundles = {};

  for (const [path, messages] of Object.entries(localeModules)) {
    const match = path.match(localeFilePattern);
    if (!match || match[1] !== stem) {
      continue;
    }
    const tag = match[2]!;
    bundles[tag] = messages;
  }

  return applyLocaleAliases(bundles);
}

/**
 * Creates an i18n client scoped to a Lit component using the current app locale.
 *
 * The returned client resolves translation keys from the supplied locale bundles
 * and tracks the locale selected at the app root.
 *
 * @param bundles - Per-locale message bundles for the component's translation keys.
 * @returns An i18n client whose local bundle lookup follows {@link getAppLocale} on each translate.
 */
export function createComponentI18n(bundles: I18nLocaleBundles) {
  return createI18nClient({
    locale: getAppLocale(),
    bundles: applyLocaleAliases(bundles),
  });
}

/**
 * Create a component client from all locale JSON files matching `locales/<stem>.*.json`.
 *
 * @param stem - Component locale file stem (e.g. `lb-export-page`)
 */
export function createComponentI18nFor(stem: string) {
  return createComponentI18n(bundlesForComponent(stem));
}
