/**
 * Placeholder page for config sections not yet implemented.
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { PoElement } from './po-element.js';
import { configStubPageI18n } from './po-config-stub-page.i18n.js';
import { configStubPageKeys } from './po-config-stub-page.keys.js';
import { poConfigStubPageStyles } from './po-config-stub-page.styles.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';

export class PoConfigStubPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poConfigStubPageStyles];

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
      <section class="page">
        <h2>${this.title}</h2>
        ${this.sdPath ? html`<p class="config-path">${this.sdPath}</p>` : ''}
        <wa-card class="stub-card">
          <p>${this.description}</p>
          <p class="hint">${configStubPageI18n.translate(configStubPageKeys.stubHint)}</p>
        </wa-card>
      </section>
    `;
  }
}

customElements.define('po-config-stub-page', PoConfigStubPage);
