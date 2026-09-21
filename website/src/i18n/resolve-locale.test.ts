/**
 * Tests for app locale and Intl locale resolution.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { createI18nClient } from './create-client.js';
import {
  DEFAULT_LOCALE,
  getAppLocale,
  resolveLocale,
  setAppLocale,
} from './resolve-locale.js';

describe('resolve-locale', () => {
  beforeEach(() => {
    setAppLocale(DEFAULT_LOCALE);
  });

  it('getAppLocale returns the active app locale', () => {
    expect(getAppLocale()).toBe('en');
    setAppLocale('de_DE');
    expect(getAppLocale()).toBe('de_DE');
  });

  it('resolveLocale prefers explicit locale override', () => {
    setAppLocale('en');
    expect(resolveLocale({ locale: 'de_DE' })).toBe('de-DE');
  });

  it('resolveLocale uses client locale when no override', () => {
    const client = createI18nClient({ locale: 'fr_FR', parent: null, bundles: {} });
    expect(resolveLocale({ client })).toBe('fr-FR');
  });

  it('resolveLocale falls back to app locale', () => {
    setAppLocale('en_US');
    expect(resolveLocale()).toBe('en-US');
  });

  it('resolveLocale converts underscore tags to BCP 47 for Intl', () => {
    expect(resolveLocale({ locale: 'en_US' })).toBe('en-US');
    expect(resolveLocale({ locale: 'de' })).toBe('de');
  });
});
