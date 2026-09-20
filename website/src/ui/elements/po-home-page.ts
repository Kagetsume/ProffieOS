/**
 * Intro / overview — what the SD Config Editor is for.
 */
import { html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { PoElement } from './po-element.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';

type ConfigFileRow = {
  path: string;
  purpose: string;
  status: 'ready' | 'partial' | 'planned';
};

const CONFIG_FILES: ConfigFileRow[] = [
  {
    path: 'config/board.ini',
    purpose: 'Button count, OLED, Bluetooth',
    status: 'ready',
  },
  {
    path: 'config/features.ini',
    purpose: 'Gesture and twist on/off (contest overrides)',
    status: 'ready',
  },
  {
    path: 'config/blades.ini',
    purpose: 'NeoPixel and accent wiring, power pins',
    status: 'ready',
  },
  {
    path: 'config/blade_styles.ini',
    purpose: 'Layer recipes for config-driven styles',
    status: 'partial',
  },
  {
    path: 'config/presets.ini',
    purpose: 'Fonts, tracks, preset names, style lines',
    status: 'planned',
  },
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
        <h2>Welcome</h2>
        <p class="lead">
          <strong>ProffieOS SD Config Editor</strong> helps you build and edit the INI files that
          live on a Proffie saber’s SD card — without recompiling firmware or connecting over serial
          for everyday wiring, feature, and style changes.
        </p>
        <p class="requirement">
          <strong>Requires SD config file support in your firmware build.</strong>
          Your saber must be compiled with a profile such as
          <code>config/config-files-config.h</code> (<code>CONFIG_FILE</code> in
          <code>ProffieOS.ino</code>). Without that, INI files under <code>config/</code> on the SD
          card are ignored.
        </p>

        <wa-card>
          <h3>What it does</h3>
          <p>
            Use the sections in the sidebar to configure board hardware, features, blade wiring,
            styles, and presets. The app keeps your work in the browser, validates common mistakes,
            and generates formatted INI text you can copy or download to <code>config/</code> on the
            SD card.
          </p>
          <p class="hint">
            This is a <strong>frontend-only</strong> tool: no account, no cloud save, no firmware
            flashing. Export when you are ready to test on hardware.
          </p>
        </wa-card>

        <wa-card>
          <h3>SD config files</h3>
          <table class="file-table">
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Purpose</th>
                <th scope="col">In editor</th>
              </tr>
            </thead>
            <tbody>
              ${CONFIG_FILES.map((row) => this.renderFileRow(row))}
            </tbody>
          </table>
        </wa-card>

        <wa-card>
          <h3>Typical workflow</h3>
          <ol class="steps">
            <li>Set up <strong>Board</strong> and <strong>Features</strong> for your chassis and contest rules.</li>
            <li>Define <strong>Blades</strong> — data pins, pixel counts, and power FET assignments.</li>
            <li>Add <strong>Blade styles</strong> and <strong>Presets</strong> (coming soon).</li>
            <li>Open <strong>Export</strong>, copy or download INI files, and copy them to the SD card.</li>
            <li>Boot the saber with your <code>config-files-config.h</code> profile and verify on hardware.</li>
          </ol>
          <div class="actions">
            <wa-button variant="brand" href="#/board">Start with Board</wa-button>
            <wa-button variant="neutral" href="#/blades">Edit blades</wa-button>
            <wa-button variant="neutral" href="#/export">Export</wa-button>
          </div>
        </wa-card>
      </section>
    `;
  }

  private renderFileRow(row: ConfigFileRow) {
    const statusLabel =
      row.status === 'ready' ? 'Editor ready' : row.status === 'partial' ? 'Partial' : 'Planned';
    return html`
      <tr>
        <td class="file-path">${row.path}</td>
        <td>${row.purpose}</td>
        <td class="status status--${row.status}">${statusLabel}</td>
      </tr>
    `;
  }
}

customElements.define('po-home-page', PoHomePage);
