/**
 * Locale-aware date/time formatting via `Intl.DateTimeFormat`.
 *
 * @module i18n/format-date
 */
import { resolveLocale } from './resolve-locale.js';
import type { DateFormatLength, DateFormatPart, FormatDateOptions } from './types.js';

function intlDateTimeOptions(
  part: DateFormatPart,
  length: DateFormatLength,
  timeZone?: string,
): Intl.DateTimeFormatOptions {
  const options: Intl.DateTimeFormatOptions = {};

  if (part === 'date' || part === 'datetime') {
    options.dateStyle = length;
  }
  if (part === 'time' || part === 'datetime') {
    options.timeStyle = length;
  }
  if (timeZone) {
    options.timeZone = timeZone;
  }

  return options;
}

/**
 * Format a `Date` for the active locale via `Intl.DateTimeFormat`.
 *
 * **Locale resolution:** `options.locale` → `options.client.locale` → {@link getAppLocale}
 * (converted to BCP 47).
 *
 * **Defaults:** `part: 'datetime'`, `length: 'medium'`.
 *
 * @param date - Date instance to format
 * @param options - Which portions to show (`date` / `time` / `datetime`), length preset,
 *   optional `timeZone`, and locale source
 * @returns Locale-formatted date/time string
 */
export function formatDate(date: Date, options?: FormatDateOptions): string {
  const part = options?.part ?? 'datetime';
  const length = options?.length ?? 'medium';
  const intlOptions = intlDateTimeOptions(part, length, options?.timeZone);
  return new Intl.DateTimeFormat(resolveLocale(options), intlOptions).format(date);
}
