/**
 * Locale-aware number formatting via `Intl.NumberFormat`.
 *
 * @module i18n/format-number
 */
import { resolveLocale } from './resolve-locale.js';
import type { FormatNumberOptions } from './types.js';

/**
 * Format a number for the active locale via `Intl.NumberFormat`.
 *
 * **Locale resolution:** `options.locale` → `options.client.locale` → {@link getAppLocale}
 * (converted to BCP 47).
 *
 * **Extra options:** any `Intl.NumberFormatOptions` field (`style`, `currency`,
 * `minimumFractionDigits`, …) may be passed through.
 *
 * @param value - Number to format
 * @param options - Optional locale source and Intl options
 * @returns Locale-formatted number string
 */
export function formatNumber(value: number, options?: FormatNumberOptions): string {
  const { locale: _locale, client: _client, ...intlOptions } = options ?? {};
  return new Intl.NumberFormat(resolveLocale(options), intlOptions).format(value);
}
