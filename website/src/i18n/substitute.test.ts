/**
 * Tests for ${variable} substitution.
 */
import { describe, expect, it } from 'vitest';
import { applySubstitutions } from './substitute.js';

describe('applySubstitutions', () => {
  it('returns sanitized template when no map is provided', () => {
    expect(applySubstitutions('Hello world')).toBe('Hello world');
    expect(applySubstitutions('<b>Hello</b>')).toBe('Hello');
  });

  it('replaces known ${variables}', () => {
    expect(applySubstitutions('Blade ${index} of ${total}', { index: 1, total: 3 })).toBe(
      'Blade 1 of 3',
    );
  });

  it('coerces number and boolean values to strings', () => {
    expect(applySubstitutions('Count: ${n}, ok: ${ok}', { n: 42, ok: true })).toBe(
      'Count: 42, ok: true',
    );
  });

  it('leaves unknown ${variables} unchanged', () => {
    expect(applySubstitutions('Hello ${name}', {})).toBe('Hello ${name}');
    expect(applySubstitutions('${a} and ${b}', { a: 'X' })).toBe('X and ${b}');
  });

  it('ignores extra map keys not referenced in the template', () => {
    expect(applySubstitutions('Static', { unused: 'value' })).toBe('Static');
  });

  it('trims whitespace inside ${ } delimiters', () => {
    expect(applySubstitutions('Value: ${ name }', { name: 'test' })).toBe('Value: test');
  });

  it('leaves token when mapped value is null or undefined', () => {
    expect(applySubstitutions('Hi ${name}', { name: undefined })).toBe('Hi ${name}');
    expect(applySubstitutions('Hi ${name}', { name: null as unknown as string })).toBe(
      'Hi ${name}',
    );
  });

  it('sanitizes substitution values', () => {
    expect(applySubstitutions('Hello ${name}', { name: '<script>x</script>' })).toBe('Hello ');
    expect(applySubstitutions('Hello ${name}', { name: '<em>World</em>' })).toBe('Hello World');
  });

  it('sanitizes the final assembled string', () => {
    expect(applySubstitutions('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('replaces multiple occurrences of the same variable', () => {
    expect(applySubstitutions('${x}-${x}', { x: 'a' })).toBe('a-a');
  });
});
