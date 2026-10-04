/**
 * Blade card — data pin dropdown for Simple PWM and NeoPixel blades.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { switchAppLocale } from '../../i18n/index.js';
import type { BladeDefinition } from '../../model/blades';
import { getUsedDataPinsForPicker } from '../../stores/data-pin-usage';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './lb-pin-picker.js';
import './lb-blade-card.js';

describe('lb-blade-card', () => {
  afterEach(() => {
    switchAppLocale('en');
  });

  it('updates visible strings after switchAppLocale', async () => {
    const blades: BladeDefinition[] = [
      { index: 2, type: 'ws2811', dataPin: 'blade1Pin', pixels: 144, powerPins: ['fet1'] },
    ];
    const card = document.createElement('lb-blade-card') as HTMLElement & {
      blade: BladeDefinition;
      blades: BladeDefinition[];
    };
    card.blade = blades[0];
    card.blades = blades;
    switchAppLocale('en');
    const { unmount } = await mount(card);

    const headerText = () =>
      card.querySelector('.blade-card-header strong')?.textContent?.trim();
    expect(headerText()).toBe('Blade 2');

    switchAppLocale('fr');
    await (card as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    expect(headerText()).toBe('Lame 2');
    unmount();
  });

  it('renders a data pin picker with labeled options for simple PWM', async () => {
    const blades: BladeDefinition[] = [
      { index: 2, type: 'simple', dataPin: 'blade5Pin', led: 'CreeXPE2White', activeState: 'high' },
      { index: 3, type: 'simple', dataPin: 'blade6Pin', led: 'CreeXPE2White', activeState: 'high' },
    ];

    const card = document.createElement('lb-blade-card') as HTMLElement & {
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
