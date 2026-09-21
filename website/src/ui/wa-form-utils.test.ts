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
});
