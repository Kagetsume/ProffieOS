/**
 * Blade card — data pin dropdown for Simple PWM and NeoPixel blades.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../../model/blades';
import { getUsedDataPinsForPicker } from '../../stores/data-pin-usage';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-pin-picker.js';
import './po-blade-card.js';

describe('po-blade-card', () => {
  it('renders a data pin picker with labeled options for simple PWM', async () => {
    const blades: BladeDefinition[] = [
      { index: 2, type: 'simple', dataPin: 'blade5Pin', led: 'CreeXPE2White', activeState: 'high' },
      { index: 3, type: 'simple', dataPin: 'blade6Pin', led: 'CreeXPE2White', activeState: 'high' },
    ];

    const card = document.createElement('po-blade-card') as HTMLElement & {
      blade: BladeDefinition;
      blades: BladeDefinition[];
    };
    card.blade = blades[0];
    card.blades = blades;
    const { unmount } = await mount(card);

    const picker = getByTestId(card, 'blade-card-data-pin-picker');
    expect((picker as HTMLElement & { mode: string }).mode).toBe('data');

    const select = getByTestId(picker, 'pin-picker-select');
    const blade5 = Array.from(select.querySelectorAll('wa-option')).find(
      (o) => (o as HTMLElement & { value: string }).value === 'blade5Pin',
    ) as (HTMLElement & { textContent: string; disabled: boolean }) | undefined;
    expect(blade5?.textContent).toContain('Free 1 / accent PWM');
    expect(blade5?.disabled).toBe(false);

    const used = getUsedDataPinsForPicker(2, blades);
    const blade6 = Array.from(select.querySelectorAll('wa-option')).find(
      (o) => (o as HTMLElement & { value: string }).value === 'blade6Pin',
    ) as (HTMLElement & { disabled: boolean }) | undefined;
    expect(used.has('blade6Pin')).toBe(true);
    expect(blade6?.disabled).toBe(true);

    unmount();
  });
});
