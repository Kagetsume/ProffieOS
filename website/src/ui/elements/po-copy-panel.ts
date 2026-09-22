/**
 * Read-only INI preview with clipboard copy and file download.
 *
 * @module ui/elements/po-copy-panel
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { contextLogger } from '../../logger/index.js';
import { copyPanelI18n } from './po-copy-panel.i18n.js';
import { copyPanelKeys } from './po-copy-panel.keys.js';
import { PoElement } from './po-element.js';
import { poCopyPanelStyles } from './po-copy-panel.styles.js';

export class PoCopyPanel extends PoElement {
  static properties = {
    title: { type: String },
    filename: { type: String },
    content: { type: String },
  };

  static styles = poCopyPanelStyles;

  title = '';
  filename = '';
  content = '';

  private copyLabel = copyPanelI18n.translate(copyPanelKeys.copy);
  private copyResetTimer = 0;

  /**
   * Clears the copy-label reset timer when the panel is removed from the DOM.
   *
   * @returns Nothing; delegates to `super.disconnectedCallback` after cleanup.
   */
  disconnectedCallback(): void {
    const log = contextLogger('po-copy-panel', 'disconnectedCallback');
    log.entry({ hasTimer: Boolean(this.copyResetTimer) });
    if (this.copyResetTimer) {
      log.debug('branch: clearing copy reset timer', { timer: this.copyResetTimer });
      clearTimeout(this.copyResetTimer);
      this.copyResetTimer = 0;
    }
    super.disconnectedCallback();
    log.exit();
  }

  /**
   * Copies panel content to the clipboard and briefly shows a confirmation label.
   *
   * @returns Promise that resolves when the copy attempt finishes (success or failure).
   */
  private onCopy = async (): Promise<void> => {
    const log = contextLogger('po-copy-panel', 'onCopy');
    log.entry({ filename: this.filename, contentLength: this.content.length });
    try {
      await navigator.clipboard.writeText(this.content);
      this.copyLabel = copyPanelI18n.translate(copyPanelKeys.copied);
      this.requestUpdate();
      if (this.copyResetTimer) {
        log.debug('branch: clearing existing copy reset timer', { timer: this.copyResetTimer });
        clearTimeout(this.copyResetTimer);
      }
      this.copyResetTimer = window.setTimeout(() => {
        this.copyResetTimer = 0;
        if (!this.isConnected) {
          return;
        }
        this.copyLabel = copyPanelI18n.translate(copyPanelKeys.copy);
        this.requestUpdate();
      }, 1500);
      log.exit('copied');
    } catch (error) {
      log.exit('failed', error);
    }
  };

  /**
   * Triggers a browser download of the panel content as a plain-text file.
   *
   * @returns Nothing; creates a temporary object URL and programmatically clicks it.
   */
  private onDownload = (): void => {
    const log = contextLogger('po-copy-panel', 'onDownload');
    log.entry({ filename: this.filename, contentLength: this.content.length });
    const blob = new Blob([this.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    log.exit({ filename: this.filename });
  };

  /**
   * Renders a read-only INI preview with copy and download actions.
   *
   * @returns Lit template for the copy panel card and textarea.
   */
  render() {
    return html`
      <wa-card data-testid="copy-panel">
        <div slot="header" class="copy-panel-header">
          <strong>${this.title}</strong>
          <span class="copy-panel-filename">${this.filename}</span>
        </div>
        <textarea
          data-testid="copy-panel-content"
          readonly
          spellcheck="false"
          .value=${this.content}
        ></textarea>
        <div class="copy-panel-actions">
          <wa-button data-testid="copy-panel-copy-button" variant="brand" @click=${this.onCopy}>
            <wa-icon name="copy" label=${copyPanelI18n.translate(copyPanelKeys.copy)}></wa-icon>
            ${this.copyLabel}
          </wa-button>
          <wa-button data-testid="copy-panel-download-button" variant="neutral" @click=${this.onDownload}>
            <wa-icon name="download" label=${copyPanelI18n.translate(copyPanelKeys.download)}></wa-icon>
            ${copyPanelI18n.translate(copyPanelKeys.download)}
          </wa-button>
        </div>
      </wa-card>
    `;
  }
}

customElements.define('po-copy-panel', PoCopyPanel);
