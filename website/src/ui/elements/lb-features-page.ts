/**
 * Features config editor — `config/features.ini` (gesture, twist on/off).
 *
 * @module ui/elements/lb-features-page
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import type { BoardFeaturesState } from '../../model/board';
import { $boardFeatures, boardFeaturesChanged } from '../../stores/boardFeatures';
import { contextLogger } from '../../logger/index.js';
import { EffectorController } from '../effector-controller.js';
import { LbElement } from './lb-element.js';
import { featuresPageI18n } from './lb-features-page.i18n.js';
import { featuresPageFieldKeys, featuresPageKeys } from './lb-features-page.keys.js';
import { lbFeaturesPageStyles } from './lb-features-page.styles.js';
import { lbConfigFormStyles, lbHostStyles, lbPageStyles } from './lb-shared-styles.js';

type FeatureField = {
  key: 'gesture' | 'twistOn' | 'twistOff';
};

const FEATURE_FIELDS: FeatureField[] = [
  { key: 'gesture' },
  { key: 'twistOn' },
  { key: 'twistOff' },
];

export class LbFeaturesPage extends LbElement {
  static styles = [lbHostStyles, lbPageStyles, lbConfigFormStyles, lbFeaturesPageStyles];

  private readonly featuresController = new EffectorController(this, $boardFeatures);

  /**
   * Renders a labeled feature toggle with description text.
   *
   * @param field Feature metadata identifying which board feature to edit.
   * @param state Current board features state used for the switch checked value.
   * @returns Lit template for one feature field row.
   */
  private renderField(field: FeatureField, state: BoardFeaturesState) {
    const checked = state[field.key];
    return html`
      <div class="feature-field" data-testid="features-field-${field.key}">
        <span class="feature-label">${featuresPageI18n.translate(featuresPageFieldKeys[field.key].label)}</span>
        <p class="feature-description">${featuresPageI18n.translate(featuresPageFieldKeys[field.key].description)}</p>
        <wa-switch
          data-testid="features-switch-${field.key}"
          .checked=${checked}
          @change=${(event: Event) =>
            this.patch({ [field.key]: (event.target as HTMLInputElement).checked })}
        ></wa-switch>
      </div>
    `;
  }

  /**
   * Applies a partial update to the board features store.
   *
   * @param partial Fields to merge into the current board features state.
   * @returns Nothing; updates are dispatched via the Effector store.
   */
  private patch(partial: Partial<BoardFeaturesState>): void {
    const log = contextLogger('lb-features-page', 'patch');
    log.entry({ partial });
    boardFeaturesChanged(partial);
    log.exit();
  }

  /**
   * Renders the features config form with toggle switches for gesture and twist settings.
   *
   * @returns Lit template for the features.ini editor page.
   */
  render() {
    const state = this.featuresController.value;
    return html`
      <section class="page" data-testid="features-page">
        <h2>${featuresPageI18n.translate(featuresPageKeys.title)}</h2>
        <p class="config-lead">${featuresPageI18n.translate(featuresPageKeys.lead)}</p>

        <wa-card>
          <div class="feature-list">
            ${FEATURE_FIELDS.map((field) => this.renderField(field, state))}
          </div>
        </wa-card>

        <p class="hint">${featuresPageI18n.translate(featuresPageKeys.hintExportAs, { filename: 'features.ini' })}</p>
      </section>
    `;
  }
}

customElements.define('lb-features-page', LbFeaturesPage);
