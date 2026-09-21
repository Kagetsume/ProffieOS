/**
 * Tests for DOMPurify sanitization of i18n strings.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeI18nString } from './sanitize.js';

describe('sanitizeI18nString', () => {
  it('passes through plain text unchanged', () => {
    expect(sanitizeI18nString('Copy')).toBe('Copy');
    expect(sanitizeI18nString('Blade 2 of 5')).toBe('Blade 2 of 5');
  });

  it('strips HTML tags but keeps text content', () => {
    expect(sanitizeI18nString('<em>World</em>')).toBe('World');
    expect(sanitizeI18nString('<strong>Bold</strong> text')).toBe('Bold text');
  });

  it('removes script tags and their content', () => {
    expect(sanitizeI18nString('<script>alert(1)</script>')).toBe('');
    expect(sanitizeI18nString('Before<script>x</script>After')).toBe('BeforeAfter');
  });

  it('removes event-handler attributes from markup', () => {
    expect(sanitizeI18nString('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('handles empty input', () => {
    expect(sanitizeI18nString('')).toBe('');
  });
});
