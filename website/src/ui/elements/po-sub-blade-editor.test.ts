/**
 * Sub-blade editor — NeoPixel LED index ranges.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-sub-blade-editor.js';

describe('po-sub-blade-editor', () => {
  it('renders add control when no ranges', async () => {
    const el = document.createElement('po-sub-blade-editor') as HTMLElement & {
      subBlades: unknown[];
      pixels: number;
    };
    el.subBlades = [];
    el.pixels = 144;
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'sub-blade-editor-add')).toBeTruthy();
    unmount();
  });
});
