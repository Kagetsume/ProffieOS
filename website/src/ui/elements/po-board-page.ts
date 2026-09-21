/**
 * Board config editor — `config/board.ini` hardware fields.
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import type { BoardFeaturesState, ButtonCount } from '../../model/board';
import { $boardFeatures, boardFeaturesChanged } from '../../stores/boardFeatures';
import { contextLogger } from '../../logger/index.js';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { boardPageI18n } from './po-board-page.i18n.js';
import { boardPageKeys } from './po-board-page.keys.js';
import { poConfigFormStyles, poHostStyles, poPageStyles } from './po-shared-styles.js';

export class PoBoardPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poConfigFormStyles];

  private readonly featuresController = new EffectorController(this, $boardFeatures);

  /**
   * Renders the board config form bound to the current board features store state.
   *
   * @returns Lit template for the board.ini editor page.
   */
  render() {
    const state = this.featuresController.value;
    return html`
      <section class="page">
        <h2>${boardPageI18n.translate(boardPageKeys.title)}</h2>
        <p class="config-lead">${boardPageI18n.translate(boardPageKeys.lead)}</p>

        <wa-card>
          <div class="form-grid">
            <label>
              ${boardPageI18n.translate(boardPageKeys.labelButtonCount)}
              <wa-select
                .value=${String(state.buttons)}
                @wa-change=${(event: Event) =>
                  this.patch({
                    buttons: Number((event.target as HTMLSelectElement).value) as ButtonCount,
                  })}
              >
                <wa-option value="1">${boardPageI18n.translate(boardPageKeys.optionButtons1)}</wa-option>
                <wa-option value="2">${boardPageI18n.translate(boardPageKeys.optionButtons2)}</wa-option>
                <wa-option value="3">${boardPageI18n.translate(boardPageKeys.optionButtons3)}</wa-option>
              </wa-select>
            </label>

            <label class="switch-row">
              ${boardPageI18n.translate(boardPageKeys.labelOled)}
              <wa-switch
                .checked=${state.oled}
                @change=${(event: Event) =>
                  this.patch({ oled: (event.target as HTMLInputElement).checked })}
              ></wa-switch>
            </label>

            <label class="switch-row">
              ${boardPageI18n.translate(boardPageKeys.labelBluetooth)}
              <wa-switch
                .checked=${state.bluetooth}
                @change=${(event: Event) =>
                  this.patch({ bluetooth: (event.target as HTMLInputElement).checked })}
              ></wa-switch>
            </label>
          </div>
        </wa-card>

        <p class="hint">${boardPageI18n.translate(boardPageKeys.hintExportAs, { filename: 'board.ini' })}</p>
      </section>
    `;
  }

  /**
   * Applies a partial update to the board features store.
   *
   * @param partial Fields to merge into the current board features state.
   * @returns Nothing; updates are dispatched via the Effector store.
   */
  private patch(partial: Partial<BoardFeaturesState>): void {
    const log = contextLogger('po-board-page', 'patch');
    log.entry({ partial });
    boardFeaturesChanged(partial);
    log.exit();
  }
}

customElements.define('po-board-page', PoBoardPage);
