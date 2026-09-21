/**
 * Tests for locale tag normalization and bundle lookup order.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bundleLookupTags } from './bundles.js';
import {
  detectBrowserLocale,
  localeLookupChain,
  normalizeLocaleTag,
  toIntlLocaleTag,
} from './locale-chain.js';

describe('locale-chain', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes hyphenated tags to underscores', () => {
    expect(normalizeLocaleTag('en-US')).toBe('en_US');
    expect(normalizeLocaleTag('  de-DE ')).toBe('de_DE');
  });

  it('builds language_REGION then language lookup chains', () => {
    expect(localeLookupChain('en_US')).toEqual(['en_US', 'en']);
    expect(localeLookupChain('en')).toEqual(['en']);
  });

  it('appends root after locale tags for bundle lookup', () => {
    expect(bundleLookupTags('en_US')).toEqual(['en_US', 'en', 'root']);
    expect(bundleLookupTags('en')).toEqual(['en', 'root']);
  });

  it('detectBrowserLocale returns a normalized tag', () => {
    expect(detectBrowserLocale()).toMatch(/^[a-z]{2}(_[A-Z]{2})?$/);
  });

  it('detectBrowserLocale falls back when navigator is unavailable', () => {
    vi.stubGlobal('navigator', undefined);
    expect(detectBrowserLocale()).toBe('en');
  });

  it('detectBrowserLocale falls back when navigator.language is empty', () => {
    vi.stubGlobal('navigator', { language: '  ' });
    expect(detectBrowserLocale()).toBe('en');
  });

  it('toIntlLocaleTag converts underscore tags for Intl APIs', () => {
    expect(toIntlLocaleTag('en_US')).toBe('en-US');
    expect(toIntlLocaleTag('de')).toBe('de');
    expect(toIntlLocaleTag('zh_Hans_CN')).toBe('zh-Hans-CN');
  });

  it('localeLookupChain returns empty array for blank input', () => {
    expect(localeLookupChain('')).toEqual([]);
    expect(localeLookupChain('   ')).toEqual([]);
  });
});
