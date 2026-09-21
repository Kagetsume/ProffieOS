/**
 * Placeholder page for config sections not yet implemented.
 */
import { html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { PoElement } from './po-element.js';
import { configStubPageI18n } from './po-config-stub-page.i18n.js';
import { configStubPageKeys } from './po-config-stub-page.keys.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';

export class PoConfigStubPage extends PoElement {
  static styles = [
    poHostStyles,
    poPageStyles,
    css`
      wa-card {
        display: block;
        width: 100%;
      }

      .stub-card p {
        margin: 0 0 0.75rem;
      }

      .stub-card p:last-child {
        margin-bottom: 0;
      }

      .config-path {
        font-family: ui-monospace, monospace;
        font-size: 0.875rem;
        opacity: 0.8;
      }
    `,
  ];

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
