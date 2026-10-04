/**
 * Tests for supported locale resolution.
 */
import { describe, expect, it } from 'vitest';
import { resolveSupportedAppLocale } from './supported-locales.js';

describe('resolveSupportedAppLocale', () => {
  it('maps regional Chinese tags to script bundles', () => {
    expect(resolveSupportedAppLocale('zh_CN')).toBe('zh_Hans');
    expect(resolveSupportedAppLocale('zh_TW')).toBe('zh_Hant');
  });

  it('falls back through language subtags', () => {
    expect(resolveSupportedAppLocale('de_DE')).toBe('de');
    expect(resolveSupportedAppLocale('fr_FR')).toBe('fr');
  });

  it('returns English when unsupported', () => {
    expect(resolveSupportedAppLocale('pt_BR')).toBe('en');
    expect(resolveSupportedAppLocale('xx_YY')).toBe('en');
    expect(resolveSupportedAppLocale('')).toBe('en');
  });

  it('maps Simplified Chinese script variants to zh_Hans', () => {
    expect(resolveSupportedAppLocale('zh_Hans_SG')).toBe('zh_Hans');
  });

  it('maps unsupported Chinese regions without script to English', () => {
    expect(resolveSupportedAppLocale('zh_SG')).toBe('en');
  });
});
