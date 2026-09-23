/**
 * Export route — live preview of generated INI files.
 *
 * @module ui/elements/po-export-page
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { $export } from '../../stores/export';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { exportPageI18n } from './po-export-page.i18n.js';
import {
  exportFileTabKeys,
  exportPageKeys,
  type ExportFileId,
} from './po-export-page.keys.js';
import { poExportPageStyles } from './po-export-page.styles.js';
import { poHostStyles, poPageStyles, poSectionCardStyles } from './po-shared-styles.js';
import './po-copy-panel.js';

const EXPORT_FILE_COUNT = 5;

type ExportFileSpec = {
  id: ExportFileId;
  testId: string;
  title: string;
  filename: string;
  contentKey: 'bladesIni' | 'bladeStylesIni' | 'presetsIni' | 'boardIni' | 'featuresIni';
};

const EXPORT_FILES: ExportFileSpec[] = [
  {
    id: 'blades',
    testId: 'export-panel-blades',
    title: 'blades.ini',
    filename: 'blades.ini',
    contentKey: 'bladesIni',
  },
  {
    id: 'bladeStyles',
    testId: 'export-panel-blade-styles',
    title: 'blade_styles.ini',
    filename: 'blade_styles.ini',
    contentKey: 'bladeStylesIni',
  },
  {
    id: 'presets',
    testId: 'export-panel-presets',
    title: 'presets.ini',
    filename: 'presets.ini',
    contentKey: 'presetsIni',
  },
  {
    id: 'board',
    testId: 'export-panel-board',
    title: 'board.ini',
    filename: 'board.ini',
    contentKey: 'boardIni',
  },
  {
    id: 'features',
    testId: 'export-panel-features',
    title: 'features.ini',
    filename: 'features.ini',
    contentKey: 'featuresIni',
  },
];

export class PoExportPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poSectionCardStyles, poExportPageStyles];

  private readonly exportState = new EffectorController(this, $export);

  private selectedFile: ExportFileId = 'blades';

  /**
   * Selects which INI file preview is shown.
   *
   * @param id Export file identifier for the tab selector.
   */
  private selectFile(id: ExportFileId): void {
    this.selectedFile = id;
    this.requestUpdate();
  }

  /**
   * Renders the tab-like file selector row.
   */
  private renderFileSelector() {
    return html`
      <div
        class="export-file-selector"
        data-testid="export-file-selector"
        role="tablist"
        aria-label=${exportPageI18n.translate(exportPageKeys.title)}
      >
        ${EXPORT_FILES.map(
          (file) => html`
            <wa-button
              role="tab"
              data-testid="export-tab-${file.id}"
              size="small"
              variant=${this.selectedFile === file.id ? 'brand' : 'neutral'}
              aria-selected=${this.selectedFile === file.id ? 'true' : 'false'}
              @click=${() => this.selectFile(file.id)}
            >
              ${exportPageI18n.translate(exportFileTabKeys[file.id])}
            </wa-button>
          `,
        )}
      </div>
    `;
  }

  /**
   * Renders the active copy panel for the selected export file.
   */
  private renderActivePanel() {
    const files = this.exportState.value;
    const active = EXPORT_FILES.find((file) => file.id === this.selectedFile) ?? EXPORT_FILES[0]!;
    return html`
      <po-copy-panel
        data-testid=${active.testId}
        title=${active.title}
        filename=${active.filename}
        .content=${files[active.contentKey]}
      ></po-copy-panel>
    `;
  }

  /**
   * Renders live export previews for all generated INI config files.
   *
   * @returns Lit template with summary, file selector, and one active copy panel.
   */
  render() {
    return html`
      <section class="page" data-testid="export-page">
        <h2>${exportPageI18n.translate(exportPageKeys.title)}</h2>
        <p>${exportPageI18n.translate(exportPageKeys.lead)}</p>

        <wa-card class="section-card export-summary" data-testid="export-page-summary">
          <p>
            ${exportPageI18n.translate(exportPageKeys.summary, { count: String(EXPORT_FILE_COUNT) })}
          </p>
        </wa-card>

        ${this.renderFileSelector()}

        <div class="export-panels" data-testid="export-page-panels">${this.renderActivePanel()}</div>
      </section>
    `;
  }
}

customElements.define('po-export-page', PoExportPage);
