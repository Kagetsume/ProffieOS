/**
 * Export route — live preview of generated INI files.
 *
 * @module ui/elements/po-export-page
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { formatSaberWriteStatus } from '../../export/format-saber-write-status.js';
import { writeSaberConfigFiles } from '../../export/write-saber-config.js';
import {
  BLADES_INI,
  BLADE_STYLES_INI,
  BOARD_INI,
  FEATURES_INI,
  PRESETS_INI,
  getSaberStorage,
  isDesktopStorage,
} from '../../platform/index.js';
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
  writeTestId: string;
  title: string;
  filename: string;
  relativePath: string;
  contentKey: 'bladesIni' | 'bladeStylesIni' | 'presetsIni' | 'boardIni' | 'featuresIni';
};

const EXPORT_FILES: ExportFileSpec[] = [
  {
    id: 'blades',
    testId: 'export-panel-blades',
    writeTestId: 'export-write-blades',
    title: 'blades.ini',
    filename: 'blades.ini',
    relativePath: BLADES_INI,
    contentKey: 'bladesIni',
  },
  {
    id: 'bladeStyles',
    testId: 'export-panel-blade-styles',
    writeTestId: 'export-write-blade-styles',
    title: 'blade_styles.ini',
    filename: 'blade_styles.ini',
    relativePath: BLADE_STYLES_INI,
    contentKey: 'bladeStylesIni',
  },
  {
    id: 'presets',
    testId: 'export-panel-presets',
    writeTestId: 'export-write-presets',
    title: 'presets.ini',
    filename: 'presets.ini',
    relativePath: PRESETS_INI,
    contentKey: 'presetsIni',
  },
  {
    id: 'board',
    testId: 'export-panel-board',
    writeTestId: 'export-write-board',
    title: 'board.ini',
    filename: 'board.ini',
    relativePath: BOARD_INI,
    contentKey: 'boardIni',
  },
  {
    id: 'features',
    testId: 'export-panel-features',
    writeTestId: 'export-write-features',
    title: 'features.ini',
    filename: 'features.ini',
    relativePath: FEATURES_INI,
    contentKey: 'featuresIni',
  },
];

export class PoExportPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poSectionCardStyles, poExportPageStyles];

  private readonly exportState = new EffectorController(this, $export);

  private selectedFile: ExportFileId = 'blades';

  private saberRoot: string | null = null;

  private writeStatus = '';

  /**
   * Shows the current saber root on desktop for write-to-SD actions.
   */
  connectedCallback(): void {
    super.connectedCallback();
    void this.refreshSaberRoot();
  }

  private async refreshSaberRoot(): Promise<void> {
    if (!isDesktopStorage()) {
      return;
    }
    try {
      const storage = getSaberStorage();
      this.saberRoot = await storage.getRoot();
      this.requestUpdate();
    } catch {
      /* storage not ready */
    }
  }

  private writeStatusMessages() {
    return {
      wroteAll: (params: { count: string; names: string }) =>
        exportPageI18n.translate(exportPageKeys.statusWroteAll, params),
      wroteFile: (params: { path: string; bytes: string }) =>
        exportPageI18n.translate(exportPageKeys.statusWroteFile, params),
      writeErrors: (params: { details: string }) =>
        exportPageI18n.translate(exportPageKeys.statusWriteErrors, params),
    };
  }

  private async resolveSaberRootForWrite(): Promise<boolean> {
    const storage = getSaberStorage();
    const root = this.saberRoot ?? (await storage.getRoot());
    if (!root) {
      this.writeStatus = exportPageI18n.translate(exportPageKeys.statusChooseFolder);
      this.requestUpdate();
      return false;
    }
    this.saberRoot = root;
    return true;
  }

  private async runWrite(specs: ExportFileSpec[]): Promise<void> {
    if (!(await this.resolveSaberRootForWrite())) {
      return;
    }
    const storage = getSaberStorage();
    const state = this.exportState.value;
    const results = await writeSaberConfigFiles(
      storage,
      specs.map((file) => ({
        relativePath: file.relativePath,
        label: file.filename,
        content: state[file.contentKey],
      })),
    );
    this.writeStatus = formatSaberWriteStatus(results, this.writeStatusMessages());
    this.requestUpdate();
  }

  private onWriteAllConfigFiles = async (): Promise<void> => {
    await this.runWrite(EXPORT_FILES);
  };

  private onWriteFile = (file: ExportFileSpec) => async (): Promise<void> => {
    await this.runWrite([file]);
  };

  private renderDesktopWriteActions() {
    if (!isDesktopStorage()) {
      return null;
    }
    return html`
      <wa-card class="section-card" data-testid="export-desktop-write">
        <p>${exportPageI18n.translate(exportPageKeys.desktopWriteLead)}</p>
        <p data-testid="export-saber-root">
          ${this.saberRoot ?? exportPageI18n.translate(exportPageKeys.saberRootNotSet)}
        </p>
        <div class="export-saber-actions">
          <wa-button
            size="small"
            variant="brand"
            data-testid="export-write-all"
            @click=${this.onWriteAllConfigFiles}
          >
            ${exportPageI18n.translate(exportPageKeys.writeAllConfig)}
          </wa-button>
          ${EXPORT_FILES.map(
            (file) => html`
              <wa-button
                size="small"
                variant="neutral"
                data-testid=${file.writeTestId}
                @click=${this.onWriteFile(file)}
              >
                ${exportPageI18n.translate(exportPageKeys.writeFile, {
                  filename: file.filename,
                })}
              </wa-button>
            `,
          )}
        </div>
        ${this.writeStatus
          ? html`<p data-testid="export-write-status">${this.writeStatus}</p>`
          : null}
      </wa-card>
    `;
  }

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

        ${this.renderDesktopWriteActions()}

        ${this.renderFileSelector()}

        <div class="export-panels" data-testid="export-page-panels">${this.renderActivePanel()}</div>
      </section>
    `;
  }
}

customElements.define('po-export-page', PoExportPage);
