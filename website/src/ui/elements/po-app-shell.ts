/**
 * Compact application bar — title, export shortcut, dark mode toggle.
 *
 * @module ui/elements/po-app-shell
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { resolveTheme, setTheme, type ThemePreference } from '../theme.js';
import { PoElement } from './po-element.js';
import { appShellI18n } from './po-app-shell.i18n.js';
import { appShellKeys } from './po-app-shell.keys.js';
import { poAppShellStyles } from './po-app-shell.styles.js';

export class PoAppShell extends PoElement {
  static styles = poAppShellStyles;

  private theme: ThemePreference = resolveTheme();

  /**
   * Syncs local theme state when the bar is attached.
   */
  connectedCallback(): void {
    super.connectedCallback();
    this.theme = resolveTheme();
  }

  /**
   * Persists and applies theme from the dark-mode switch.
   *
   * @param event Change event from the theme `wa-switch`.
   */
  private onThemeChange = (event: Event): void => {
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    const checked =
      typeof control.checked === 'boolean'
        ? control.checked
        : (control.querySelector('input[type="checkbox"]') as HTMLInputElement | null)?.checked;
    if (checked === undefined) {
      return;
    }
    const next: ThemePreference = checked ? 'dark' : 'light';
    setTheme(next);
    this.theme = next;
    this.requestUpdate();
  };

  /**
   * Renders the compact app bar with title, export link, and theme toggle.
   */
  render() {
    const dark = this.theme === 'dark';
    return html`
      <div class="app-bar-inner" data-testid="app-shell">
        <h1 class="app-title" data-testid="app-shell-title">
          ${appShellI18n.translate(appShellKeys.title)}
        </h1>
        <div class="app-bar-actions">
          <wa-button
            data-testid="app-shell-export-link"
            variant="neutral"
            size="small"
            href="#/export"
          >
            <wa-icon name="file-export" label=""></wa-icon>
            ${appShellI18n.translate(appShellKeys.exportLink)}
          </wa-button>
          <label class="theme-toggle">
            <wa-icon name=${dark ? 'moon' : 'sun'} label=""></wa-icon>
            <wa-switch
              data-testid="app-shell-theme-toggle"
              size="small"
              .checked=${dark}
              @change=${this.onThemeChange}
            ></wa-switch>
            <span>${appShellI18n.translate(dark ? appShellKeys.darkMode : appShellKeys.lightMode)}</span>
          </label>
        </div>
      </div>
    `;
  }
}

customElements.define('po-app-shell', PoAppShell);
