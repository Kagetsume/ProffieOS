/**
 * Sub-blade range editor — split one NeoPixel strip into logical blades.
 *
 * Exports `sub_blade = first, last` lines (inclusive, 0-based). Up to {@link MAX_SUB_BLADES} ranges.
 * See `doc/blade_config.md` and `model/sub-blades.ts`.
 *
 * @fires sub-blades-change - `{ subBlades: SubBladeRange[] }`
 * @module ui/elements/po-sub-blade-editor
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import type { SubBladeRange } from '../../model/blades';
import {
  addSubBladeRow,
  isValidSubBladeRange,
  removeSubBladeRow,
  subBladeLedCount,
  updateSubBladeRow,
} from '../../model/sub-blades';
import { MAX_SUB_BLADES } from '../../validation/limits';
import { contextLogger } from '../../logger/index.js';
import { subBladeEditorI18n } from './po-sub-blade-editor.i18n.js';
import { subBladeEditorKeys } from './po-sub-blade-editor.keys.js';

/**
 * Editable list of sub-blade pixel ranges for one NeoPixel strip.
 *
 * @fires sub-blades-change - `{ subBlades: SubBladeRange[] }`
 */
export class PoSubBladeEditor extends LitElement {
  static properties = {
    subBlades: { attribute: false },
    pixels: { type: Number },
  };

  subBlades: SubBladeRange[] = [];
  pixels = 0;

  private localSubBlades: SubBladeRange[] = [];

  /**
   * Renders into light DOM so nested Web Awesome controls work without shadow boundaries.
   *
   * @returns This element as its own render root.
   */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  /**
   * Syncs local editable state when the parent passes a new `subBlades` array.
   *
   * @param changed - Lit property change map from the current update cycle.
   */
  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('subBlades') && this.subBlades !== this.localSubBlades) {
      this.localSubBlades = [...this.subBlades];
    }
  }

  /**
   * Builds the sub-blade range editor — rows with first/last inputs, validation, and add/remove actions.
   *
   * @returns Lit template for the sub-blade editor UI.
   */
  render() {
    const rows = this.localSubBlades;
    const logicalCount = rows.length > 0 ? rows.length : 1;

    return html`
      <div class="sub-blade-editor" data-field="subBlades">
        <div class="sub-blade-heading">
          ${subBladeEditorI18n.translate(subBladeEditorKeys.heading)}
          <span class="sub-blade-hint"
            >${subBladeEditorI18n.translate(subBladeEditorKeys.hint, {
              logicalCount,
              logicalSuffix: logicalCount === 1 ? '' : 's',
              maxSubBlades: MAX_SUB_BLADES,
            })}</span
          >
        </div>
        ${rows.length === 0
          ? html`<p class="sub-blade-empty">${subBladeEditorI18n.translate(subBladeEditorKeys.empty)}</p>`
          : html`
              <div class="sub-blade-rows">
                ${rows.map(
                  (row, index) => html`
                    <div class="sub-blade-row" data-sub-blade-row="${index}">
                      <span class="sub-blade-slot">${subBladeEditorI18n.translate(subBladeEditorKeys.slotLabel)}</span>
                      <label>
                        ${subBladeEditorI18n.translate(subBladeEditorKeys.labelFirst)}
                        <wa-input
                          type="number"
                          min="0"
                          .value=${String(row.first)}
                          @wa-input=${(event: Event) =>
                            this.onFieldInput(index, 'first', event)}
                        ></wa-input>
                      </label>
                      <label>
                        ${subBladeEditorI18n.translate(subBladeEditorKeys.labelLast)}
                        <wa-input
                          type="number"
                          min="0"
                          .value=${String(row.last)}
                          @wa-input=${(event: Event) =>
                            this.onFieldInput(index, 'last', event)}
                        ></wa-input>
                      </label>
                      <span
                        class="sub-blade-meta ${isValidSubBladeRange(row, this.pixels)
                          ? ''
                          : 'sub-blade-meta--invalid'}"
                      >
                        ${isValidSubBladeRange(row, this.pixels)
                          ? subBladeEditorI18n.translate(subBladeEditorKeys.metaLedCount, {
                              count: subBladeLedCount(row),
                              ledSuffix: subBladeLedCount(row) === 1 ? '' : 's',
                            })
                          : subBladeEditorI18n.translate(subBladeEditorKeys.metaInvalid, { pixels: this.pixels })}
                      </span>
                      <wa-button
                        size="small"
                        variant="neutral"
                        data-action="remove-sub-blade"
                        @click=${() => this.removeRow(index)}
                      >
                        ${subBladeEditorI18n.translate(subBladeEditorKeys.remove)}
                      </wa-button>
                    </div>
                  `,
                )}
              </div>
            `}
        <wa-button
          class="sub-blade-add"
          size="small"
          variant="brand"
          data-action="add-sub-blade"
          ?disabled=${rows.length >= MAX_SUB_BLADES}
          @click=${this.addRow}
        >
          ${subBladeEditorI18n.translate(subBladeEditorKeys.addRange)}
        </wa-button>
      </div>
    `;
  }

  /**
   * Updates local state and notifies the parent of a new sub-blade range list.
   *
   * @param next - Complete sub-blade range array after an edit.
   */
  private emitSubBlades(next: SubBladeRange[]): void {
    const log = contextLogger('po-sub-blade-editor', 'emitSubBlades');
    log.entry({ next, previous: this.localSubBlades });
    this.localSubBlades = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('sub-blades-change', {
        detail: { subBlades: next },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit({ subBlades: next });
  }

  /**
   * Handles first/last pixel input on one sub-blade row.
   *
   * @param index - Zero-based row index in {@link localSubBlades}.
   * @param field - Which bound of the inclusive range changed (`first` or `last`).
   * @param event - Input event from the corresponding `wa-input`.
   */
  private onFieldInput(
    index: number,
    field: 'first' | 'last',
    event: Event,
  ): void {
    const log = contextLogger('po-sub-blade-editor', 'onFieldInput');
    const value = Number((event.target as HTMLInputElement).value);
    log.entry({ index, field, value });
    this.emitSubBlades(
      updateSubBladeRow(this.localSubBlades, index, {
        [field]: Number.isFinite(value) ? value : 0,
      }),
    );
    log.exit();
  }

  /**
   * Appends a new sub-blade range row using model defaults.
   */
  private addRow = (): void => {
    const log = contextLogger('po-sub-blade-editor', 'addRow');
    log.entry({ rowCount: this.localSubBlades.length, max: MAX_SUB_BLADES });
    this.emitSubBlades(addSubBladeRow(this.localSubBlades));
    log.exit({ rowCount: this.localSubBlades.length });
  };

  /**
   * Removes one sub-blade range row by index.
   *
   * @param index - Zero-based row index to delete.
   */
  private removeRow = (index: number): void => {
    const log = contextLogger('po-sub-blade-editor', 'removeRow');
    log.entry({ index, rowCount: this.localSubBlades.length });
    this.emitSubBlades(removeSubBladeRow(this.localSubBlades, index));
    log.exit({ rowCount: this.localSubBlades.length });
  };
}

customElements.define('po-sub-blade-editor', PoSubBladeEditor);
