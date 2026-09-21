/**
 * Features config editor — `config/features.ini` (gesture, twist on/off).
 */
import { html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import type { BoardFeaturesState } from '../../model/board';
import { $boardFeatures, boardFeaturesChanged } from '../../stores/boardFeatures';
import { contextLogger } from '../../logger/index.js';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { featuresPageI18n } from './po-features-page.i18n.js';
import { featuresPageFieldKeys, featuresPageKeys } from './po-features-page.keys.js';
import { poConfigFormStyles, poHostStyles, poPageStyles } from './po-shared-styles.js';

type FeatureField = {
  key: 'gesture' | 'twistOn' | 'twistOff';
};

const FEATURE_FIELDS: FeatureField[] = [
  { key: 'gesture' },
  { key: 'twistOn' },
  { key: 'twistOff' },
];

export class PoFeaturesPage extends PoElement {
  static styles = [
    poHostStyles,
    poPageStyles,
    poConfigFormStyles,
    css`
      .feature-list {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 0.25rem 0;
        width: 100%;
      }

      .feature-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .feature-label {
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.3;
      }

      .feature-description {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: normal;
        line-height: 1.45;
        opacity: 0.85;
      }

      .feature-field wa-switch {
        align-self: flex-start;
      }
    `,
  ];

  private readonly featuresController = new EffectorController(this, $boardFeatures);

  render() {
    const state = this.featuresController.value;
    return html`
      <section class="page">
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

  private renderField(field: FeatureField, state: BoardFeaturesState) {
    const checked = state[field.key];
    return html`
      <div class="feature-field">
        <span class="feature-label">${featuresPageI18n.translate(featuresPageFieldKeys[field.key].label)}</span>
        <p class="feature-description">${featuresPageI18n.translate(featuresPageFieldKeys[field.key].description)}</p>
        <wa-switch
          .checked=${checked}
          @change=${(event: Event) =>
            this.patch({ [field.key]: (event.target as HTMLInputElement).checked })}
        ></wa-switch>
      </div>
    `;
  }

  private patch(partial: Partial<BoardFeaturesState>): void {
    const log = contextLogger('po-features-page', 'patch');
    log.entry({ partial });
    boardFeaturesChanged(partial);
    log.exit();
  }
}

customElements.define('po-features-page', PoFeaturesPage);
