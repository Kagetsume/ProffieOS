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
import './po-blade-card.js';

export class PoWiringPage extends LitElement {
  private unwatchWiring?: () => void;
  private unwatchProfile?: () => void;

  blades: BladeDefinition[] = [];
  profileId = '';

  static properties = {
    blades: { attribute: false, state: true },
    profileId: { attribute: false, state: true },
  };

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.unwatchWiring = $wiring.watch((blades) => {
      this.blades = blades;
    });
    this.unwatchProfile = $boardProfileId.watch((id) => {
      this.profileId = id;
    });
  }

  override disconnectedCallback(): void {
    this.unwatchWiring?.();
    this.unwatchProfile?.();
    super.disconnectedCallback();
  }

  render() {
    const profileName = getProfileName(this.profileId);

    return html`
      <section class="page">
        <h2>Blades — ${profileName}</h2>
        <p>
          Edit blade definitions for <code>config/blades.ini</code>. No server — changes stay in
          the browser until you export.
        </p>
        <details class="blades-help">
          <summary>What is this file for?</summary>
          <ul>
            <li>
              <strong>NeoPixel strips</strong> — main blade, second strips, pixel pommels:
              <code>data_pin</code>, <code>pixels</code>, power FET(s).
            </li>
            <li>
              <strong>Simple PWM accents</strong> — Free1–3, motors, single LEDs:
              <code>type = simple</code> + <code>led</code>; pair with
              <code>accent_*</code> styles in <code>presets.ini</code>.
            </li>
            <li>
              <strong>Sub-blades</strong> — split one physical strip into styled segments (e.g.
              main body + crystal chamber on one data line).
            </li>
          </ul>
          <p>
            Wiring lives here; colors and effects live in <code>presets.ini</code> (
            <code>style =</code> per logical blade). Match firmware <code>NUM_BLADES</code> to
            the logical blade count shown below.
          </p>
          <p>
            Examples and setup guide:
            <a href="https://github.com/profezzorn/ProffieOS/blob/main/website/BLADES.md"
              >website/BLADES.md</a
            >
            (also in the repo next to this editor).
          </p>
        </details>
        <div class="toolbar">
          <label>
            Board profile
            <wa-select .value=${this.profileId} @wa-change=${this.onProfileChange}>
              ${boardProfiles.profiles.map(
                (profile) => html`
                  <wa-option value=${profile.id}>${profile.name}</wa-option>
                `,
              )}
            </wa-select>
          </label>
          <wa-button variant="neutral" @click=${this.onApplyProfile}>
            Reset to profile defaults
          </wa-button>
          <wa-button variant="brand" @click=${this.onAddBlade}>Add blade</wa-button>
        </div>
        <div class="blade-list">
          ${this.blades.map(
            (blade) => html`
              <po-blade-card
                .blade=${blade}
                .blades=${this.blades}
                @blade-patch=${this.onBladePatch}
                @blade-remove=${this.onBladeRemove}
              ></po-blade-card>
            `,
          )}
        </div>
        <p class="hint">
          Up to ${MAX_BLADES} wiring entries. Logical blades for presets:
          ${totalLogicalBladeSlots(this.blades)} (match <code>NUM_BLADES</code> and
          <code>style =</code> count — sub-blade ranges each add one logical blade).
        </p>
      </section>
    `;
  }

  private onProfileChange = (event: Event): void => {
    boardProfileChanged((event.target as HTMLSelectElement).value);
  };

  private onApplyProfile = (): void => {
    applyProfileDefaults();
  };

  private onAddBlade = (): void => {
    bladeAdded();
  };

  private onBladePatch = (event: CustomEvent<{ index: number; patch: Partial<BladeDefinition> }>): void => {
    bladeUpdated(event.detail);
  };

  private onBladeRemove = (event: CustomEvent<{ index: number }>): void => {
    bladeRemoved(event.detail.index);
  };
}

customElements.define('po-wiring-page', PoWiringPage);
