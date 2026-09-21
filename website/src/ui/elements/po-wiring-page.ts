/**
 * Blades wiring route — board profile, blade cards, logical blade count hint.
 *
 * Subscribes to `$wiring` and `$boardProfileId`. Route: `#/blades` (alias `#/wiring`).
 *
 * @module ui/elements/po-wiring-page
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import boardProfiles from '../../catalog/board-profiles.json';
import { contextLogger } from '../../logger/index.js';
import type { BladeDefinition } from '../../model/blades';
import { totalLogicalBladeSlots } from '../../model/sub-blades';
import {
  $boardProfileId,
  boardProfileChanged,
  getProfileName,
} from '../../stores/project';
import {
  $wiring,
  applyProfileDefaults,
  bladeAdded,
  bladeRemoved,
  bladeUpdated,
} from '../../stores/wiring';
import { MAX_BLADES } from '../../validation/limits';
import { EffectorController } from '../effector-controller.js';
import { wiringPageI18n } from './po-wiring-page.i18n.js';
import { wiringPageKeys } from './po-wiring-page.keys.js';
import './po-blade-card.js';

export class PoWiringPage extends LitElement {
  private readonly wiringController = new EffectorController(this, $wiring);
  private readonly profileController = new EffectorController(this, $boardProfileId);

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const blades = this.wiringController.value;
    const profileId = this.profileController.value;
    const profileName = getProfileName(profileId);

    return html`
      <section class="page">
        <h2>${wiringPageI18n.translate(wiringPageKeys.title, { profileName })}</h2>
        <p>${wiringPageI18n.translate(wiringPageKeys.lead)}</p>
        <details class="blades-help">
          <summary>${wiringPageI18n.translate(wiringPageKeys.helpSummary)}</summary>
          <ul>
            <li>${wiringPageI18n.translate(wiringPageKeys.helpNeopixel)}</li>
            <li>${wiringPageI18n.translate(wiringPageKeys.helpSimple)}</li>
            <li>${wiringPageI18n.translate(wiringPageKeys.helpSubBlades)}</li>
          </ul>
          <p>${wiringPageI18n.translate(wiringPageKeys.helpWiringNote)}</p>
          <p>
            ${wiringPageI18n.translate(wiringPageKeys.helpExamplesPrefix)}
            <a href="https://github.com/profezzorn/ProffieOS/blob/main/website/BLADES.md"
              >${wiringPageI18n.translate(wiringPageKeys.helpExamplesLink)}</a
            >
            ${wiringPageI18n.translate(wiringPageKeys.helpExamplesSuffix)}
          </p>
        </details>
        <div class="toolbar">
          <label>
            ${wiringPageI18n.translate(wiringPageKeys.labelBoardProfile)}
            <wa-select .value=${profileId} @wa-change=${this.onProfileChange}>
              ${boardProfiles.profiles.map(
                (profile) => html`
                  <wa-option value=${profile.id}>${profile.name}</wa-option>
                `,
              )}
            </wa-select>
          </label>
          <wa-button variant="neutral" @click=${this.onApplyProfile}>
            ${wiringPageI18n.translate(wiringPageKeys.resetProfile)}
          </wa-button>
          <wa-button variant="brand" @click=${this.onAddBlade}
            >${wiringPageI18n.translate(wiringPageKeys.addBlade)}</wa-button
          >
        </div>
        <div class="blade-list">
          ${blades.map(
            (blade) => html`
              <po-blade-card
                .blade=${blade}
                .blades=${blades}
                @blade-patch=${this.onBladePatch}
                @blade-remove=${this.onBladeRemove}
              ></po-blade-card>
            `,
          )}
        </div>
        <p class="hint">
          ${wiringPageI18n.translate(wiringPageKeys.hintFooter, {
            maxBlades: MAX_BLADES,
            logicalCount: totalLogicalBladeSlots(blades),
          })}
        </p>
      </section>
    `;
  }

  private onProfileChange = (event: Event): void => {
    const log = contextLogger('po-wiring-page', 'onProfileChange');
    const profileId = (event.target as HTMLSelectElement).value;
    log.entry({ profileId });
    boardProfileChanged(profileId);
    log.exit();
  };

  private onApplyProfile = (): void => {
    const log = contextLogger('po-wiring-page', 'onApplyProfile');
    log.entry();
    applyProfileDefaults();
    log.exit();
  };

  private onAddBlade = (): void => {
    const log = contextLogger('po-wiring-page', 'onAddBlade');
    log.entry({ currentCount: this.wiringController.value.length });
    bladeAdded();
    log.exit();
  };

  private onBladePatch = (event: CustomEvent<{ index: number; patch: Partial<BladeDefinition> }>): void => {
    const log = contextLogger('po-wiring-page', 'onBladePatch');
    log.entry({ index: event.detail.index, patchKeys: Object.keys(event.detail.patch) });
    bladeUpdated(event.detail);
    log.exit();
  };

  private onBladeRemove = (event: CustomEvent<{ index: number }>): void => {
    const log = contextLogger('po-wiring-page', 'onBladeRemove');
    log.entry({ index: event.detail.index });
    bladeRemoved(event.detail.index);
    log.exit();
  };
}

customElements.define('po-wiring-page', PoWiringPage);
