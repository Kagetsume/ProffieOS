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

export class PoSubBladeEditor extends LitElement {
  static properties = {
    subBlades: { attribute: false },
    pixels: { type: Number },
  };

  subBlades: SubBladeRange[] = [];
  pixels = 0;

  private localSubBlades: SubBladeRange[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('subBlades') && this.subBlades !== this.localSubBlades) {
      this.localSubBlades = [...this.subBlades];
    }
  }

  render() {
    const rows = this.localSubBlades;
    const logicalCount = rows.length > 0 ? rows.length : 1;

    return html`
      <div class="sub-blade-editor" data-field="subBlades">
        <div class="sub-blade-heading">
          Sub-blades
          <span class="sub-blade-hint">
            Split this strip into ${logicalCount} logical blade${logicalCount === 1 ? '' : 's'}
            (${logicalCount} preset <code>style =</code> line${logicalCount === 1 ? '' : 's'}).
            Leave empty to use the full strip. Up to ${MAX_SUB_BLADES} ranges —
            <code>sub_blade = first, last</code> (0-based, inclusive).
          </span>
        </div>
        ${rows.length === 0
          ? html`<p class="sub-blade-empty">Full strip — no sub_blade lines exported.</p>`
          : html`
              <div class="sub-blade-rows">
                ${rows.map(
                  (row, index) => html`
                    <div class="sub-blade-row" data-sub-blade-row="${index}">
                      <span class="sub-blade-slot">sub_blade</span>
                      <label>
                        first
                        <wa-input
                          type="number"
                          min="0"
                          .value=${String(row.first)}
                          @wa-input=${(event: Event) =>
                            this.onFieldInput(index, 'first', event)}
                        ></wa-input>
                      </label>
                      <label>
                        last
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
                          ? `${subBladeLedCount(row)} LED${subBladeLedCount(row) === 1 ? '' : 's'}`
                          : `Invalid (need 0 ≤ first ≤ last < ${this.pixels})`}
                      </span>
                      <wa-button
                        size="small"
                        variant="neutral"
                        data-action="remove-sub-blade"
                        @click=${() => this.removeRow(index)}
                      >
                        Remove
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
          Add sub-blade range
        </wa-button>
      </div>
    `;
  }

  private emitSubBlades(next: SubBladeRange[]): void {
    this.localSubBlades = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('sub-blades-change', {
        detail: { subBlades: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onFieldInput(
    index: number,
    field: 'first' | 'last',
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.emitSubBlades(
      updateSubBladeRow(this.localSubBlades, index, {
        [field]: Number.isFinite(value) ? value : 0,
      }),
    );
  }

  private addRow = (): void => {
    this.emitSubBlades(addSubBladeRow(this.localSubBlades));
  };

  private removeRow = (index: number): void => {
    this.emitSubBlades(removeSubBladeRow(this.localSubBlades, index));
  };
}

customElements.define('po-sub-blade-editor', PoSubBladeEditor);
