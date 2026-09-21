/**
 * Intro / overview — what the SD Config Editor is for.
 */
import { html, css } from 'lit';
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
  static styles = [
    poHostStyles,
    poPageStyles,
    css`
      .lead {
        font-size: 1.05rem;
        max-width: 65ch;
        line-height: 1.5;
      }

      .requirement {
        max-width: 65ch;
        margin: 1rem 0 1.5rem;
        padding: 0.85rem 1rem;
        border-left: 3px solid var(--wa-color-warning-50, #b45309);
        border-radius: var(--wa-border-radius-medium, 6px);
        background: var(--wa-color-warning-95, #fffbeb);
        font-size: 0.9375rem;
        line-height: 1.45;
      }

      wa-card {
        display: block;
        width: 100%;
        margin-bottom: 1rem;
      }

      wa-card h3 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }

      wa-card p {
        margin: 0 0 0.75rem;
        max-width: 65ch;
        line-height: 1.45;
      }

      wa-card p:last-child {
        margin-bottom: 0;
      }

      .file-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      .file-table th,
      .file-table td {
        text-align: left;
        padding: 0.5rem 0.65rem;
        border-bottom: 1px solid var(--wa-color-neutral-85, #d4d4d8);
        vertical-align: top;
      }

      .file-table th {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.7;
      }

      .file-path {
        font-family: ui-monospace, monospace;
        font-size: 0.8125rem;
        white-space: nowrap;
      }

      .status {
        font-size: 0.8125rem;
        white-space: nowrap;
      }

      .status--ready {
        color: var(--wa-color-success-50, #15803d);
      }

      .status--partial {
        color: var(--wa-color-warning-50, #b45309);
      }

      .status--planned {
        opacity: 0.65;
      }

      .steps {
        margin: 0;
        padding-left: 1.25rem;
        max-width: 65ch;
        line-height: 1.5;
      }

      .steps li + li {
        margin-top: 0.35rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
    `,
  ];

  render() {
    return html`
      <section class="page">
        <h2>${homePageI18n.translate(homePageKeys.title)}</h2>
        <p class="lead">${homePageI18n.translate(homePageKeys.lead)}</p>
        <p class="requirement">${homePageI18n.translate(homePageKeys.requirement)}</p>

        <wa-card>
          <h3>${homePageI18n.translate(homePageKeys.cardWhatItDoesTitle)}</h3>
          <p>${homePageI18n.translate(homePageKeys.cardWhatItDoesBody)}</p>
          <p class="hint">${homePageI18n.translate(homePageKeys.cardWhatItDoesHint)}</p>
        </wa-card>

        <wa-card>
          <h3>${homePageI18n.translate(homePageKeys.cardConfigFilesTitle)}</h3>
          <table class="file-table">
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
}

customElements.define('po-home-page', PoHomePage);
