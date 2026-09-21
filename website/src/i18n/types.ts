/**
 * Shared i18n types.
 *
 * @module i18n/types
 */

/** BCP 47-ish locale id (e.g. `en`, `de`). */
export type LocaleId = string;

/** Flat key → message map for one language file. */
export type I18nMessages = Readonly<Record<string, string>>;

/** Values for `${variable}` placeholders in translated strings. */
export type SubstitutionMap = Readonly<Record<string, string | number | boolean>>;

/**
 * Message tables for one client.
 *
 * Keys are locale tags (`en_US`, `en`) plus optional `root` (client-wide fallback).
 */
export type I18nLocaleBundles = {
  root?: I18nMessages;
} & Record<string, I18nMessages | undefined>;

/** Options for {@link I18nClient}. */
export type I18nClientOptions = {
  locale: LocaleId;
  bundles: I18nLocaleBundles;
  /**
   * Parent client for unresolved keys.
   *
   * - omitted → application root client
   * - `null` → no parent (use for the root client itself)
   */
  parent?: import('./client.js').I18nClient | null;
};

/** Explicit locale and/or client used to pick a locale for Intl formatters. */
export type LocaleSource = {
  locale?: LocaleId;
  client?: import('./client.js').I18nClient;
};

/** Which portions of a timestamp to include. */
export type DateFormatPart = 'date' | 'time' | 'datetime';

/** Intl `dateStyle` / `timeStyle` length preset. */
export type DateFormatLength = 'short' | 'medium' | 'long' | 'full';

export type FormatNumberOptions = LocaleSource &
  Omit<Intl.NumberFormatOptions, 'locale'>;

export type FormatDateOptions = LocaleSource & {
  /** Defaults to `datetime`. */
  part?: DateFormatPart;
  /** Defaults to `medium`. */
  length?: DateFormatLength;
  timeZone?: string;
};
