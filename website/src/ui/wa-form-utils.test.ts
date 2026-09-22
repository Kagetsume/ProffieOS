/**
 * Tests for Web Awesome form helpers.
 */
import { describe, expect, it } from 'vitest';
import { readWaSelectValue } from './wa-form-utils';

describe('readWaSelectValue', () => {
  it('reads value from currentTarget', () => {
    const control = document.createElement('wa-select') as HTMLElement & { value: string };
    control.value = 'file:rainbow_strobe';
    const event = { currentTarget: control, target: control } as unknown as Event;
    expect(readWaSelectValue(event)).toBe('file:rainbow_strobe');
  });

  it('falls back to target value when currentTarget has no string value', () => {
    const control = document.createElement('div') as HTMLElement;
    const event = {
      currentTarget: control,
      target: { value: 'fallback-pin' },
    } as unknown as Event;
    expect(readWaSelectValue(event)).toBe('fallback-pin');
  });

  it('returns empty string when no value is available', () => {
    const event = { currentTarget: {}, target: {} } as unknown as Event;
    expect(readWaSelectValue(event)).toBe('');
  });
});
