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
import { PoElement } from './po-element.js';
import { poConfigFormStyles, poHostStyles, poPageStyles } from './po-shared-styles.js';

export class PoBoardPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poConfigFormStyles];

  private state = $boardFeatures.getState();
  private unwatch?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.unwatch = $boardFeatures.watch((state) => {
      this.state = state;
      this.requestUpdate();
    });
  }

  disconnectedCallback(): void {
    this.unwatch?.();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <section class="page">
        <h2>Board</h2>
        <p class="config-lead">
          Hardware options for <code>config/board.ini</code> — button count, OLED, and Bluetooth.
          Gesture and twist toggles are also exported here (and in
          <code>config/features.ini</code> for contest overrides).
        </p>

        <wa-card>
          <div class="form-grid">
            <label>
              Button count
              <wa-select
                .value=${String(this.state.buttons)}
                @wa-change=${(event: Event) =>
                  this.patch({
                    buttons: Number((event.target as HTMLSelectElement).value) as ButtonCount,
                  })}
              >
                <wa-option value="1">1 button</wa-option>
                <wa-option value="2">2 buttons</wa-option>
                <wa-option value="3">3 buttons</wa-option>
              </wa-select>
            </label>

            <label class="switch-row">
              OLED display
              <wa-switch
                .checked=${this.state.oled}
                @change=${(event: Event) =>
                  this.patch({ oled: (event.target as HTMLInputElement).checked })}
              ></wa-switch>
            </label>

            <label class="switch-row">
              Bluetooth serial
              <wa-switch
                .checked=${this.state.bluetooth}
                @change=${(event: Event) =>
                  this.patch({ bluetooth: (event.target as HTMLInputElement).checked })}
              ></wa-switch>
            </label>
          </div>
        </wa-card>

        <p class="hint">Changes appear on the Export page as <code>board.ini</code>.</p>
      </section>
    `;
  }

  private patch(partial: Partial<BoardFeaturesState>): void {
    boardFeaturesChanged(partial);
  }
}

customElements.define('po-board-page', PoBoardPage);
