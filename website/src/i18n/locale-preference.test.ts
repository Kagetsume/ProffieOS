/**
 * Persisted locale preference and startup resolution.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  LOCALE_STORAGE_KEY,
  getStoredAppLocale,
  resolveInitialAppLocale,
  setStoredAppLocale,
} from './locale-preference.js';
import { switchAppLocale } from './switch-app-locale.js';
import { getAppLocale } from './resolve-locale.js';

afterEach(() => {
  localStorage.removeItem(LOCALE_STORAGE_KEY);
  switchAppLocale('en');
});

describe('locale preference', () => {
  it('reads and writes stored locale tags', () => {
    expect(getStoredAppLocale()).toBeNull();
    setStoredAppLocale('de');
    expect(getStoredAppLocale()).toBe('de');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de');
  });

  it('prefers stored locale over browser on startup resolution', () => {
    setStoredAppLocale('ja');
    expect(resolveInitialAppLocale()).toBe('ja');
  });

  it('switchAppLocale persists the active locale', () => {
    switchAppLocale('es');
    expect(getAppLocale()).toBe('es');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es');
  });
});
