/**
 * SD path + local BMP upload for strip_column preview.
 *
 * @fires bmp-path-change - `{ value: string }` when the path field changes
 * @fires bmp-loaded - `{ path: string }` after a successful decode
 *
 * @module ui/elements/lb-bmp-input
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { decodeStripColumnBmp, parseStripColumnLayerArgs } from '../../preview/strip-column-bmp';
import { registerBmpAsset } from '../../stores/bmpAssets';
import { contextLogger } from '../../logger/index.js';
import { bmpInputI18n } from './lb-bmp-input.i18n.js';
import { bmpInputKeys } from './lb-bmp-input.keys.js';
import { LbElement } from './lb-element.js';

export class LbBmpInput extends LbElement {
  static properties = {
    value: { type: String },
    frameAxis: { type: String },
    error: { type: String, state: true },
  };

  value = '';
  frameAxis = 'frames_y';
  private error = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private commitPath(next: string): void {
    this.dispatchEvent(
      new CustomEvent('bmp-path-change', {
        detail: { value: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async onFileChange(event: Event): Promise<void> {
    const log = contextLogger('lb-bmp-input', 'onFileChange');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    log.entry({ name: file.name, size: file.size });
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseStripColumnLayerArgs([
        this.value || `animations/${file.name}`,
        '144',
        '30',
        this.frameAxis,
      ]);
      const asset = decodeStripColumnBmp(buffer, parsed.frameAxis);
      const path =
        this.value.trim() ||
        `animations/${file.name.replace(/\\/g, '/').split('/').pop() ?? file.name}`;
      registerBmpAsset(path, asset);
      this.error = '';
      this.commitPath(path);
      this.dispatchEvent(
        new CustomEvent('bmp-loaded', {
          detail: { path, frameCount: asset.frameCount, bladePixels: asset.bladePixels },
          bubbles: true,
          composed: true,
        }),
      );
      log.exit({ path, frames: asset.frameCount });
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Invalid BMP';
      log.debug('decode failed', { error: this.error });
    }
  }

  render() {
    return html`
      <div class="bmp-input-row">
        <wa-input
          data-testid="bmp-path-input"
          .value=${this.value}
          placeholder=${bmpInputI18n.translate(bmpInputKeys.placeholderPath)}
          aria-label=${bmpInputI18n.translate(bmpInputKeys.labelPath)}
          @wa-input=${(event: Event) =>
            this.commitPath((event.target as HTMLInputElement).value)}
        ></wa-input>
        <input
          type="file"
          accept=".bmp,image/bmp"
          hidden
          data-testid="bmp-file-input"
          aria-label=${bmpInputI18n.translate(bmpInputKeys.ariaFileInput)}
          @change=${this.onFileChange}
        />
        <wa-button
          size="small"
          variant="neutral"
          data-testid="bmp-upload-button"
          @click=${() =>
            this.renderRoot.querySelector<HTMLInputElement>('[data-testid="bmp-file-input"]')?.click()}
        >
          ${bmpInputI18n.translate(bmpInputKeys.buttonUpload)}
        </wa-button>
      </div>
      ${this.error
        ? html`<p class="hint bmp-error" role="alert">${this.error}</p>`
        : null}
      <p class="hint">${bmpInputI18n.translate(bmpInputKeys.hintFormat)}</p>
    `;
  }
}

customElements.define('lb-bmp-input', LbBmpInput);
