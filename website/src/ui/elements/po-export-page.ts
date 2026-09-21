/**
 * Export route — live preview of generated INI files.
 *
 * @module ui/elements/po-export-page
 */
import { html } from 'lit';
import { $export } from '../../stores/export';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { exportPageI18n } from './po-export-page.i18n.js';
import { exportPageKeys } from './po-export-page.keys.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';
import './po-copy-panel.js';

export class PoExportPage extends PoElement {
  static styles = [poHostStyles, poPageStyles];

  private readonly exportState = new EffectorController(this, $export);

  /**
   * Renders live export previews for all generated INI config files.
   *
   * @returns Lit template with one `po-copy-panel` per exported file.
   */
  render() {
    const files = this.exportState.value;
    return html`
      <section class="page">
        <h2>${exportPageI18n.translate(exportPageKeys.title)}</h2>
        <p>${exportPageI18n.translate(exportPageKeys.lead)}</p>
        <div class="export-panels">
          <po-copy-panel
            title="blades.ini"
            filename="blades.ini"
            .content=${files.bladesIni}
          ></po-copy-panel>
          <po-copy-panel
            title="blade_styles.ini"
            filename="blade_styles.ini"
            .content=${files.bladeStylesIni}
          ></po-copy-panel>
          <po-copy-panel
            title="presets.ini"
            filename="presets.ini"
            .content=${files.presetsIni}
          ></po-copy-panel>
          <po-copy-panel
            title="board.ini"
            filename="board.ini"
            .content=${files.boardIni}
          ></po-copy-panel>
          <po-copy-panel
            title="features.ini"
            filename="features.ini"
            .content=${files.featuresIni}
          ></po-copy-panel>
        </div>
      </section>
    `;
  }
}

customElements.define('po-export-page', PoExportPage);
