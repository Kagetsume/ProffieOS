/**
 * Tests for Intl number and date format helpers.
 */
import { describe, expect, it } from 'vitest';
import { setAppLocale } from './resolve-locale.js';
import { createI18nClient, formatDate, formatNumber, rootI18n } from './index.js';

const sampleDate = new Date('2024-06-15T14:30:00Z');

describe('formatNumber', () => {
  it('uses getAppLocale when no override is provided', () => {
    setAppLocale('de_DE');
    expect(formatNumber(1234.5)).toBe('1.234,5');
    setAppLocale('en');
  });

  it('formats using the root locale by default', () => {
    expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat(rootI18n.locale).format(1234.5));
  });

  it('formats using an explicit locale', () => {
    expect(formatNumber(1234.5, { locale: 'de-DE' })).toBe('1.234,5');
  });

  it('formats using a component client locale', () => {
    const deClient = createI18nClient({ locale: 'de-DE', parent: null, bundles: {} });
    expect(formatNumber(1234.5, { client: deClient })).toBe('1.234,5');
    expect(deClient.formatNumber(9876)).toBe('9.876');
  });

  it('forwards Intl.NumberFormat options', () => {
    expect(
      formatNumber(0.42, {
        locale: 'en-US',
        style: 'percent',
        maximumFractionDigits: 0,
      }),
    ).toBe('42%');
  });
});

describe('formatDate', () => {
  it('defaults to datetime with medium length', () => {
    const formatted = formatDate(sampleDate, { locale: 'en-US', timeZone: 'UTC' });
    expect(formatted).toContain('2024');
    expect(formatted).toMatch(/14:30|2:30/);
  });

  it('formats date-only', () => {
    const formatted = formatDate(sampleDate, {
      locale: 'en-US',
      part: 'date',
      length: 'short',
      timeZone: 'UTC',
    });
    expect(formatted).toMatch(/6\/15\/24|15\/6\/24/);
    expect(formatted).not.toMatch(/14:30|2:30/);
  });

  it('formats time-only', () => {
    const formatted = formatDate(sampleDate, {
      locale: 'en-US',
      part: 'time',
      length: 'short',
      timeZone: 'UTC',
    });
    expect(formatted).toMatch(/14:30|2:30/);
    expect(formatted).not.toContain('2024');
  });

  it('supports long and full lengths', () => {
    const longDate = formatDate(sampleDate, {
      locale: 'en-US',
      part: 'date',
      length: 'long',
      timeZone: 'UTC',
    });
    expect(longDate).toContain('June');
    expect(longDate).toContain('2024');

    const full = formatDate(sampleDate, {
      locale: 'en-US',
      part: 'datetime',
      length: 'full',
      timeZone: 'UTC',
    });
    expect(full.length).toBeGreaterThan(longDate.length);
  });

  it('uses a component client locale', () => {
    const deClient = createI18nClient({ locale: 'de-DE', parent: null, bundles: {} });
    const formatted = deClient.formatDate(sampleDate, {
      part: 'date',
      length: 'medium',
      timeZone: 'UTC',
    });
    expect(formatted).toContain('2024');
    expect(formatted).toMatch(/15| Juni |Jun/);
  });
});
