/**
 * Read-only INI preview with clipboard copy and file download.
 *
 * @module ui/elements/po-copy-panel
 */
import { html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { contextLogger } from '../../logger/index.js';
import { copyPanelI18n } from './po-copy-panel.i18n.js';
import { copyPanelKeys } from './po-copy-panel.keys.js';
import { PoElement } from './po-element.js';

export class PoCopyPanel extends PoElement {
  static properties = {
    title: { type: String },
    filename: { type: String },
    content: { type: String },
  };

  static styles = css`
    :host {
      display: block;
    }

    wa-card {
      display: block;
    }

    .copy-panel-header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.5rem;
    }

    .copy-panel-filename {
      font-size: 0.875rem;
      color: var(--wa-color-neutral-600, #666);
    }

    textarea {
      display: block;
      width: 100%;
      min-height: 8rem;
      margin: 0.75rem 0;
      padding: 0.5rem;
      font-family: ui-monospace, monospace;
      font-size: 0.8125rem;
      box-sizing: border-box;
      resize: vertical;
    }

    .copy-panel-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `;

  title = '';
  filename = '';
  content = '';

  private copyLabel = copyPanelI18n.translate(copyPanelKeys.copy);
  private copyResetTimer = 0;

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

  render() {
    return html`
      <wa-card>
        <div slot="header" class="copy-panel-header">
          <strong>${this.title}</strong>
          <span class="copy-panel-filename">${this.filename}</span>
        </div>
        <textarea readonly spellcheck="false" .value=${this.content}></textarea>
        <div class="copy-panel-actions">
          <wa-button variant="brand" @click=${this.onCopy}>
            <wa-icon name="copy" label=${copyPanelI18n.translate(copyPanelKeys.copy)}></wa-icon>
            ${this.copyLabel}
          </wa-button>
          <wa-button variant="neutral" @click=${this.onDownload}>
            <wa-icon name="download" label=${copyPanelI18n.translate(copyPanelKeys.download)}></wa-icon>
            ${copyPanelI18n.translate(copyPanelKeys.download)}
          </wa-button>
        </div>
      </wa-card>
    `;
  }

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
}

customElements.define('po-copy-panel', PoCopyPanel);
