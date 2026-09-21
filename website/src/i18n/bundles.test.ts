/**
 * Tests for locale bundle normalization and lookup tags.
 */
import { describe, expect, it } from 'vitest';
import { bundleLookupTags, normalizeBundles } from './bundles.js';

describe('normalizeBundles', () => {
  it('normalizes locale keys to underscore form', () => {
    const bundles = normalizeBundles({
      root: { a: 'root' },
      en: { a: 'en' },
      'en-US': { a: 'us' },
    });

    expect(bundles.root).toEqual({ a: 'root' });
    expect(bundles.en).toEqual({ a: 'en' });
    expect(bundles.en_US).toEqual({ a: 'us' });
  });

  it('skips undefined or empty bundle entries', () => {
    const bundles = normalizeBundles({
      en: { a: 'en' },
      de: undefined,
    });

    expect(Object.keys(bundles)).toEqual(['en']);
  });

  it('preserves the root key literally', () => {
    const bundles = normalizeBundles({ root: { key: 'value' } });
    expect(bundles.root).toEqual({ key: 'value' });
    expect(bundles).not.toHaveProperty('Root');
  });
});

describe('bundleLookupTags', () => {
  it('returns en_US, en, root for regional locales', () => {
    expect(bundleLookupTags('en_US')).toEqual(['en_US', 'en', 'root']);
    expect(bundleLookupTags('en-US')).toEqual(['en_US', 'en', 'root']);
  });

  it('returns en, root for language-only locales', () => {
    expect(bundleLookupTags('en')).toEqual(['en', 'root']);
  });

  it('handles multi-part region tags', () => {
    expect(bundleLookupTags('zh_Hans_CN')).toEqual(['zh_Hans_CN', 'zh', 'root']);
  });
});
