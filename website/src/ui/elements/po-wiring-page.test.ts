/**
 * Wiring page — board profile toolbar and blade card list.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-pin-picker.js';
import './po-blade-card.js';
import './po-wiring-page.js';

describe('po-wiring-page', () => {
  it('renders blade cards from store', async () => {
    const { el, unmount } = await mount(document.createElement('po-wiring-page'));
    expect(getByTestId(el, 'wiring-page-blade-list').querySelectorAll('po-blade-card').length).toBeGreaterThan(
      0,
    );
    unmount();
  });
});
