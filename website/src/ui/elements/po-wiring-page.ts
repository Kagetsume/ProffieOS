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

  /**
   * Uses light DOM so global page styles apply to blade wiring markup.
   *
   * @returns This element itself as the render root.
   */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  /**
   * Handles board profile selection and updates the project store.
   *
   * @param event Change event from the profile `<wa-select>`.
   * @returns Nothing; dispatches `boardProfileChanged` with the selected profile id.
   */
  private onProfileChange = (event: Event): void => {
    const log = contextLogger('po-wiring-page', 'onProfileChange');
    const profileId = (event.target as HTMLSelectElement).value;
    log.entry({ profileId });
    boardProfileChanged(profileId);
    log.exit();
  };

  /**
   * Resets blade wiring to the defaults for the currently selected board profile.
   *
   * @returns Nothing; dispatches `applyProfileDefaults`.
   */
  private onApplyProfile = (): void => {
    const log = contextLogger('po-wiring-page', 'onApplyProfile');
    log.entry();
    applyProfileDefaults();
    log.exit();
  };

  /**
   * Appends a new blade definition to the wiring store.
   *
   * @returns Nothing; dispatches `bladeAdded`.
   */
  private onAddBlade = (): void => {
    const log = contextLogger('po-wiring-page', 'onAddBlade');
    log.entry({ currentCount: this.wiringController.value.length });
    bladeAdded();
    log.exit();
  };

  /**
   * Applies a partial update to one blade from a child `po-blade-card` event.
   *
   * @param event Custom event carrying blade index and field patch.
   * @returns Nothing; dispatches `bladeUpdated` with the event detail.
   */
  private onBladePatch = (event: CustomEvent<{ index: number; patch: Partial<BladeDefinition> }>): void => {
    const log = contextLogger('po-wiring-page', 'onBladePatch');
    log.entry({ index: event.detail.index, patchKeys: Object.keys(event.detail.patch) });
    bladeUpdated(event.detail);
    log.exit();
  };

  /**
   * Removes a blade at the index reported by a child `po-blade-card` event.
   *
   * @param event Custom event carrying the blade index to remove.
   * @returns Nothing; dispatches `bladeRemoved`.
   */
  private onBladeRemove = (event: CustomEvent<{ index: number }>): void => {
    const log = contextLogger('po-wiring-page', 'onBladeRemove');
    log.entry({ index: event.detail.index });
    bladeRemoved(event.detail.index);
    log.exit();
  };

  /**
   * Renders the blades wiring page with profile selector, toolbar, and blade cards.
   *
   * @returns Lit template for the full wiring editor section.
   */
  render() {
    const blades = this.wiringController.value;
    const profileId = this.profileController.value;
    const profileName = getProfileName(profileId);

    return html`
      <section class="page" data-testid="wiring-page">
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
        <div class="blade-list" data-testid="wiring-page-blade-list">
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
}

customElements.define('po-wiring-page', PoWiringPage);
