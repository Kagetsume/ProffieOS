/**
 * Features config editor — `config/features.ini` (gesture, twist on/off).
 */
import { html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import type { BoardFeaturesState } from '../../model/board';
import { $boardFeatures, boardFeaturesChanged } from '../../stores/boardFeatures';
import { PoElement } from './po-element.js';
import { poConfigFormStyles, poHostStyles, poPageStyles } from './po-shared-styles.js';

type FeatureField = {
  key: 'gesture' | 'twistOn' | 'twistOff';
  label: string;
  description: string;
};

const FEATURE_FIELDS: FeatureField[] = [
  {
    key: 'gesture',
    label: 'Gesture ignition',
    description:
      'When on, motion gestures (swing, thrust, or twist) can ignite the blade without pressing the activation switch. When off, the saber only turns on from the button.',
  },
  {
    key: 'twistOn',
    label: 'Twist to turn on',
    description:
      'When on, rotating the hilt in the twist-on gesture powers the saber on. When off, twist cannot be used to ignite — useful if you want button-only activation.',
  },
  {
    key: 'twistOff',
    label: 'Twist to turn off',
    description:
      'When on, a twist gesture shuts the saber down. When off, twist-off is disabled — a common contest setting so the blade cannot be turned off accidentally during performance.',
  },
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
        <h2>Features</h2>
        <p class="config-lead">
          Feature toggles for <code>config/features.ini</code>. Loaded after
          <code>config/board.ini</code> — these values override gesture and twist settings from the
          board file (useful for contest-specific SD cards).
        </p>

        <wa-card>
          <div class="feature-list">
            ${FEATURE_FIELDS.map((field) => this.renderField(field))}
          </div>
        </wa-card>

        <p class="hint">Changes appear on the Export page as <code>features.ini</code>.</p>
      </section>
    `;
  }

  private renderField(field: FeatureField) {
    const checked = this.state[field.key];
    return html`
      <div class="feature-field">
        <span class="feature-label">${field.label}</span>
        <p class="feature-description">${field.description}</p>
        <wa-switch
          .checked=${checked}
          @change=${(event: Event) =>
            this.patch({ [field.key]: (event.target as HTMLInputElement).checked })}
        ></wa-switch>
      </div>
    `;
  }

  private patch(partial: Partial<BoardFeaturesState>): void {
    boardFeaturesChanged(partial);
  }
}

customElements.define('po-features-page', PoFeaturesPage);
