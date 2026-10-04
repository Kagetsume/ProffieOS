/**
 * SD path + local BMP upload for strip_column preview.
 *
 * @fires bmp-path-change - `{ value: string }` when the path field changes
 * @fires bmp-loaded - `{ path: string }` after a successful decode
 *
 * @module ui/elements/po-bmp-input
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { decodeStripColumnBmp, parseStripColumnLayerArgs } from '../../preview/strip-column-bmp';
import { registerBmpAsset } from '../../stores/bmpAssets';
import { contextLogger } from '../../logger/index.js';

export class PoBmpInput extends LitElement {
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
    const log = contextLogger('po-bmp-input', 'onFileChange');
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
          placeholder="animations/plasma.bmp"
          @wa-input=${(event: Event) =>
            this.commitPath((event.target as HTMLInputElement).value)}
        ></wa-input>
        <input
          type="file"
          accept=".bmp,image/bmp"
          hidden
          data-testid="bmp-file-input"
          @change=${this.onFileChange}
        />
        <wa-button
          size="small"
          variant="neutral"
          data-testid="bmp-upload-button"
          @click=${() =>
            this.renderRoot.querySelector<HTMLInputElement>('[data-testid="bmp-file-input"]')?.click()}
        >
          Upload BMP
        </wa-button>
      </div>
      ${this.error ? html`<p class="hint bmp-error">${this.error}</p>` : null}
      <p class="hint">24-bit uncompressed BMP · preview only (copy file to SD at this path)</p>
    `;
  }
}

customElements.define('po-bmp-input', PoBmpInput);
