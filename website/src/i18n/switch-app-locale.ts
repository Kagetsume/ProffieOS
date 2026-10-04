/**
 * Switch the application UI locale (root + app formatters).
 *
 * Component clients follow {@link getAppLocale} for bundle lookup after this call.
 *
 * @module i18n/switch-app-locale
 */
import { applyDocumentLocale, setStoredAppLocale } from './locale-preference.js';
import { buildRootLocaleBundles } from './root-bundles.js';
import { rootI18n } from './root.js';
import type { LocaleId } from './types.js';

/** Window event — Lit hosts re-render translated UI when locale changes. */
export const PO_APP_LOCALE_CHANGE = 'po-locale-change';

/** Change active locale for shared strings and component fall-through. */
export function switchAppLocale(locale: LocaleId): void {
  rootI18n.setLocale(locale, buildRootLocaleBundles());
  setStoredAppLocale(rootI18n.locale);
  applyDocumentLocale(rootI18n.locale);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PO_APP_LOCALE_CHANGE, { detail: { locale: rootI18n.locale } }),
    );
  }
}
