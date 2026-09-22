/**
 * Preset style row — one logical blade's style line editor.
 */
import { describe, expect, it } from 'vitest';
import type { PresetStyle } from '../../model/preset-styles';
import type { StyleSection } from '../../model/style-sections';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-color-input.js';
import './po-preset-style-row.js';

describe('po-preset-style-row', () => {
  it('renders style picker for a slot', async () => {
    const el = document.createElement('po-preset-style-row') as HTMLElement & {
      slotIndex: number;
      slotCount: number;
      presetStyle: PresetStyle;
      styleSections: StyleSection[];
    };
    el.slotIndex = 0;
    el.slotCount = 1;
    el.presetStyle = { kind: 'named', ref: 'standard', args: [], overrides: {}, customLine: '' };
    el.styleSections = [];
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'preset-style-row-style-select')).toBeTruthy();
    unmount();
  });
});
