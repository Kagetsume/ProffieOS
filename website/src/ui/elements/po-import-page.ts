/**
 * Import route — load saber SD config into editor stores.
 *
 * @module ui/elements/po-import-page
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import {
  applySaberImportResult,
  formatSaberImportSummary,
  importSaberConfigFromStorage,
} from '../../import/saber-config.js';
import { getSaberStorage, isDesktopStorage } from '../../platform/index.js';
import { PoElement } from './po-element.js';
import { importPageI18n } from './po-import-page.i18n.js';
import { importPageKeys } from './po-import-page.keys.js';
import { poImportPageStyles } from './po-import-page.styles.js';
import { poHostStyles, poPageStyles, poSectionCardStyles } from './po-shared-styles.js';

export class PoImportPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poSectionCardStyles, poImportPageStyles];

  private saberRoot: string | null = null;

  private saberStatus = '';

  /**
   * Loads saber root when the import page is shown in the desktop app.
   */
  connectedCallback(): void {
    super.connectedCallback();
    void this.loadSaberRootOnConnect();
  }

  private async loadSaberRootOnConnect(): Promise<void> {
    if (!isDesktopStorage()) {
      return;
    }
    try {
      const storage = getSaberStorage();
      this.saberRoot = await storage.getRoot();
      if (this.saberRoot) {
        await this.runSaberImport(storage);
      }
      this.requestUpdate();
    } catch {
      /* storage not ready */
    }
  }

  private async runSaberImport(storage = getSaberStorage()): Promise<void> {
    const root = this.saberRoot ?? (await storage.getRoot());
    if (!root) {
      this.saberStatus = importPageI18n.translate(importPageKeys.statusChooseFolder);
      this.requestUpdate();
      return;
    }
    try {
      const result = await importSaberConfigFromStorage(storage);
      applySaberImportResult(result);
      this.saberStatus = formatSaberImportSummary(result);
    } catch (error) {
      this.saberStatus = error instanceof Error ? error.message : String(error);
    }
    this.requestUpdate();
  }

  private onOpenSaberFolder = async (): Promise<void> => {
    const storage = getSaberStorage();
    const picked = await storage.pickFolder();
    this.saberRoot = picked ?? (await storage.getRoot());
    if (picked) {
      await this.runSaberImport(storage);
    } else {
      this.saberStatus = importPageI18n.translate(importPageKeys.statusPickCancelled);
    }
    this.requestUpdate();
  };

  private onReloadFromFolder = async (): Promise<void> => {
    await this.runSaberImport();
  };

  private renderBrowserNotice() {
    if (isDesktopStorage()) {
      return null;
    }
    return html`
      <wa-card class="section-card import-browser-notice" data-testid="import-browser-notice">
        <p>${importPageI18n.translate(importPageKeys.browserNotice)}</p>
      </wa-card>
    `;
  }

  private renderDesktopSaberActions() {
    if (!isDesktopStorage()) {
      return null;
    }
    return html`
      <wa-card class="section-card" data-testid="import-desktop-saber">
        <p>${importPageI18n.translate(importPageKeys.desktopCardLead)}</p>
        <p class="import-saber-root" data-testid="import-saber-root">
          ${this.saberRoot ?? importPageI18n.translate(importPageKeys.saberRootNotSet)}
        </p>
        <div class="import-saber-actions">
          <wa-button
            size="small"
            variant="brand"
            data-testid="import-open-saber"
            @click=${this.onOpenSaberFolder}
          >
            ${importPageI18n.translate(importPageKeys.openFolder)}
          </wa-button>
          ${this.saberRoot
            ? html`
                <wa-button
                  size="small"
                  variant="neutral"
                  data-testid="import-reload-saber"
                  @click=${this.onReloadFromFolder}
                >
                  ${importPageI18n.translate(importPageKeys.reloadFromFolder)}
                </wa-button>
              `
            : null}
        </div>
        ${this.saberStatus
          ? html`<p class="import-saber-status" data-testid="import-saber-status">${this.saberStatus}</p>`
          : null}
      </wa-card>
    `;
  }

  /**
   * Renders import UI for desktop SD folder access or browser guidance.
   */
  render() {
    return html`
      <section class="page" data-testid="import-page">
        <h2>${importPageI18n.translate(importPageKeys.title)}</h2>
        <p>${importPageI18n.translate(importPageKeys.lead)}</p>

        ${this.renderBrowserNotice()}
        ${this.renderDesktopSaberActions()}
      </section>
    `;
  }
}

customElements.define('po-import-page', PoImportPage);
