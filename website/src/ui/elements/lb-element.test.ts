/**
 * LbElement — locale change re-renders translated UI.
 */
import { html } from 'lit';
import { describe, expect, it, afterEach } from 'vitest';
import { switchAppLocale } from '../../i18n/index.js';
import { mount } from '../../test/lit-host-utils.js';
import { LbElement } from './lb-element.js';
import { bladeCardI18n } from './lb-blade-card.i18n.js';
import { bladeCardKeys } from './lb-blade-card.keys.js';

class LbLocaleProbe extends LbElement {
  render() {
    return html`<span data-testid="probe-text">${bladeCardI18n.translate(bladeCardKeys.header, { index: 1 })}</span>`;
  }
}

const PROBE_TAG = 'lb-locale-probe';

describe('LbElement', () => {
  afterEach(() => {
    switchAppLocale('en');
  });

  it('re-renders when switchAppLocale dispatches lb-locale-change', async () => {
    if (!customElements.get(PROBE_TAG)) {
      customElements.define(PROBE_TAG, LbLocaleProbe);
    }

    switchAppLocale('en');
    const { el, unmount } = await mount(document.createElement(PROBE_TAG));
    const text = () =>
      el.shadowRoot?.querySelector('[data-testid="probe-text"]')?.textContent?.trim();

    expect(text()).toBe('Blade 1');

    switchAppLocale('fr');
    await el.updateComplete;

    expect(text()).toBe('Lame 1');
    unmount();
  });
});
