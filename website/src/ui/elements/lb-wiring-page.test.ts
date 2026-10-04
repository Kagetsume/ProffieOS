/**
 * Wiring page — board profile toolbar and blade card list.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './lb-pin-picker.js';
import './lb-blade-card.js';
import './lb-wiring-page.js';

describe('lb-wiring-page', () => {
  it('renders blade cards from store', async () => {
    const { el, unmount } = await mount(document.createElement('lb-wiring-page'));
    expect(getByTestId(el, 'wiring-page-blade-list').querySelectorAll('lb-blade-card').length).toBeGreaterThan(
      0,
    );
    unmount();
  });
});
