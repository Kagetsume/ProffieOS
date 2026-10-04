/**
 * Placeholder page for config sections not yet implemented.
 *
 * @module ui/elements/lb-config-stub-page
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { LbElement } from './lb-element.js';
import { configStubPageI18n } from './lb-config-stub-page.i18n.js';
import { configStubPageKeys } from './lb-config-stub-page.keys.js';
import { lbConfigStubPageStyles } from './lb-config-stub-page.styles.js';
import { lbHostStyles, lbPageStyles } from './lb-shared-styles.js';

export class LbConfigStubPage extends LbElement {
  static styles = [lbHostStyles, lbPageStyles, lbConfigStubPageStyles];

  /** Page heading (e.g. "Presets"). */
  title = '';

  /** SD path (e.g. `config/presets.ini`). */
  sdPath = '';

  /** Short description from route catalog. */
  description = '';

  static properties = {
    title: { type: String },
    sdPath: { type: String, attribute: 'sd-path' },
    description: { type: String },
  };

  /**
   * Renders a placeholder page for config sections not yet implemented.
   *
   * @returns Lit template showing title, SD path, description, and stub hint.
   */
  render() {
    return html`
      <section class="page" data-testid="config-stub-page">
        <h2 data-testid="config-stub-page-title">${this.title}</h2>
        ${this.sdPath
          ? html`<p class="config-path" data-testid="config-stub-page-sd-path">${this.sdPath}</p>`
          : ''}
        <wa-card class="stub-card">
          <p>${this.description}</p>
          <p class="hint">${configStubPageI18n.translate(configStubPageKeys.stubHint)}</p>
        </wa-card>
      </section>
    `;
  }
}

customElements.define('lb-config-stub-page', LbConfigStubPage);
