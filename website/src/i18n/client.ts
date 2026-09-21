/**
 * Component-scoped i18n client.
 *
 * @module i18n/client
 */
import { bundleLookupTags, normalizeBundles, type NormalizedBundles } from './bundles.js';
import { getDefaultParentClient } from './client-registry.js';
import { formatDate as formatDateValue } from './format-date.js';
import { formatNumber as formatNumberValue } from './format-number.js';
import { normalizeLocaleTag } from './locale-chain.js';
import { setAppLocale } from './resolve-locale.js';
import { applySubstitutions } from './substitute.js';
import type {
  FormatDateOptions,
  FormatNumberOptions,
  I18nClientOptions,
  I18nLocaleBundles,
  I18nMessages,
  LocaleId,
  SubstitutionMap,
} from './types.js';

/**
 * Resolves translation keys from locale bundles, then an optional parent client chain.
 *
 * Lookup order for locale `en_US`:
 * 1. `en_US` bundle → 2. `en` bundle → 3. `root` bundle → 4. parent client (same rules)
 *
 * @example Component-local client (parents to app root by default)
 * ```ts
 * import en from './locales/en.json';
 * import enUs from './locales/en_US.json';
 * import root from './locales/root.json';
 * import { createI18nClient, detectBrowserLocale } from '../../i18n';
 *
 * export const i18n = createI18nClient({
 *   locale: detectBrowserLocale(),
 *   bundles: { root, en, en_US: enUs },
 * });
 * ```
 */
export class I18nClient {
  private localeId: LocaleId;
  private bundles: NormalizedBundles;
  /** `undefined` = default app root; `null` = no parent. */
  private parentExplicit?: I18nClient | null;

  constructor(options: I18nClientOptions) {
    this.localeId = normalizeLocaleTag(options.locale);
    this.bundles = normalizeBundles(options.bundles);
    this.parentExplicit = options.parent;
  }

  get locale(): LocaleId {
    return this.localeId;
  }

  get parent(): I18nClient | null {
    return this.getParent();
  }

  /**
   * Resolve `key`, apply optional `${variable}` substitutions, and sanitize.
   *
   * Lookup: locale chain + root bundle → parent chain → raw `key`.
   */
  translate(key: string, substitutions?: SubstitutionMap): string {
    const template = this.resolveRaw(key);
    return applySubstitutions(template, substitutions);
  }

  /** Replace locale bundle tables (keeps current locale tag). */
  setBundles(bundles: I18nLocaleBundles): void {
    this.bundles = normalizeBundles(bundles);
  }

  /** Switch active locale and bundle tables together. */
  setLocale(locale: LocaleId, bundles: I18nLocaleBundles): void {
    this.localeId = normalizeLocaleTag(locale);
    this.bundles = normalizeBundles(bundles);
    if (this.parentExplicit === null) {
      setAppLocale(this.localeId);
    }
  }

  /** Format a number using this client's locale. */
  formatNumber(value: number, options?: Omit<FormatNumberOptions, 'locale' | 'client'>): string {
    return formatNumberValue(value, { ...options, client: this });
  }

  /** Format a date using this client's locale. */
  formatDate(date: Date, options?: Omit<FormatDateOptions, 'locale' | 'client'>): string {
    return formatDateValue(date, { ...options, client: this });
  }

  /** Read a message without substitution or sanitization (testing / tooling). */
  resolveRaw(key: string): string {
    for (const tag of bundleLookupTags(this.localeId)) {
      const bundle = this.bundles[tag];
      if (bundle && Object.prototype.hasOwnProperty.call(bundle, key)) {
        return bundle[key]!;
      }
    }

    const parent = this.getParent();
    if (parent) {
      return parent.resolveRaw(key);
    }

    return key;
  }

  private getParent(): I18nClient | null {
    if (this.parentExplicit === null) {
      return null;
    }
    if (this.parentExplicit !== undefined) {
      return this.parentExplicit;
    }
    return getDefaultParentClient();
  }
}
