/**
 * Intro / overview — what the SD Config Editor is for.
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { PoElement } from './po-element.js';
import { homePageI18n } from './po-home-page.i18n.js';
import {
  homePageConfigFilePathKeys,
  homePageConfigFilePurposeKeys,
  homePageKeys,
  homePageStatusKeys,
} from './po-home-page.keys.js';
import { poHomePageStyles } from './po-home-page.styles.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';

type ConfigFileRow = {
  id: 'board' | 'features' | 'blades' | 'bladeStyles' | 'presets';
  status: 'ready' | 'partial' | 'planned';
};

const CONFIG_FILES: ConfigFileRow[] = [
  { id: 'board', status: 'ready' },
  { id: 'features', status: 'ready' },
  { id: 'blades', status: 'ready' },
  { id: 'bladeStyles', status: 'ready' },
  { id: 'presets', status: 'ready' },
];

export class PoHomePage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poHomePageStyles];

  /**
   * Renders one table row describing a config file and its editor status.
   *
   * @param row Config file metadata including id and readiness status.
   * @returns Lit template for a single `<tr>` in the config files table.
   */
  private renderFileRow(row: ConfigFileRow) {
    return html`
      <tr>
        <td class="file-path">${homePageI18n.translate(homePageConfigFilePathKeys[row.id])}</td>
        <td>${homePageI18n.translate(homePageConfigFilePurposeKeys[row.id])}</td>
        <td class="status status--${row.status}">
          ${homePageI18n.translate(homePageStatusKeys[row.status])}
        </td>
      </tr>
    `;
  }

  /**
   * Renders the home/overview page with intro copy, config file table, and workflow steps.
   *
   * @returns Lit template for the full home page section.
   */
  render() {
    return html`
      <section class="page" data-testid="home-page">
        <h2 data-testid="home-page-title">${homePageI18n.translate(homePageKeys.title)}</h2>
        <p class="lead">${homePageI18n.translate(homePageKeys.lead)}</p>
        <p class="requirement">${homePageI18n.translate(homePageKeys.requirement)}</p>

        <wa-card>
          <h3>${homePageI18n.translate(homePageKeys.cardWhatItDoesTitle)}</h3>
          <p>${homePageI18n.translate(homePageKeys.cardWhatItDoesBody)}</p>
          <p class="hint">${homePageI18n.translate(homePageKeys.cardWhatItDoesHint)}</p>
        </wa-card>

        <wa-card>
          <h3>${homePageI18n.translate(homePageKeys.cardConfigFilesTitle)}</h3>
          <table class="file-table" data-testid="home-page-config-table">
            <thead>
              <tr>
                <th scope="col">${homePageI18n.translate(homePageKeys.tableFile)}</th>
                <th scope="col">${homePageI18n.translate(homePageKeys.tablePurpose)}</th>
                <th scope="col">${homePageI18n.translate(homePageKeys.tableInEditor)}</th>
              </tr>
            </thead>
            <tbody>
              ${CONFIG_FILES.map((row) => this.renderFileRow(row))}
            </tbody>
          </table>
        </wa-card>

        <wa-card>
          <h3>${homePageI18n.translate(homePageKeys.cardWorkflowTitle)}</h3>
          <ol class="steps">
            <li>${homePageI18n.translate(homePageKeys.workflowStep1)}</li>
            <li>${homePageI18n.translate(homePageKeys.workflowStep2)}</li>
            <li>${homePageI18n.translate(homePageKeys.workflowStep3)}</li>
            <li>${homePageI18n.translate(homePageKeys.workflowStep4)}</li>
            <li>${homePageI18n.translate(homePageKeys.workflowStep5)}</li>
          </ol>
          <div class="actions">
            <wa-button variant="brand" href="#/board"
              >${homePageI18n.translate(homePageKeys.actionStartBoard)}</wa-button
            >
            <wa-button variant="neutral" href="#/blades"
              >${homePageI18n.translate(homePageKeys.actionEditBlades)}</wa-button
            >
            <wa-button variant="neutral" href="#/export"
              >${homePageI18n.translate(homePageKeys.actionExport)}</wa-button
            >
          </div>
        </wa-card>
      </section>
    `;
  }
}

customElements.define('po-home-page', PoHomePage);
