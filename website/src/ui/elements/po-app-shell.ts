/**
 * Compact application bar — title, export shortcut, dark mode toggle.
 *
 * @module ui/elements/po-app-shell
 */
import { html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import {
  getAppLocale,
  resolveSupportedAppLocale,
  switchAppLocale,
  type SupportedLocale,
} from '../../i18n/index.js';
import { readWaSelectValue } from '../wa-form-utils.js';
import { resolveTheme, setTheme, type ThemePreference } from '../theme.js';
import { PoElement } from './po-element.js';
import { appShellI18n } from './po-app-shell.i18n.js';
import { appShellKeys } from './po-app-shell.keys.js';
import { poAppShellStyles } from './po-app-shell.styles.js';

/** Supported UI locales shown in the header picker (native endonym labels). */
const APP_LOCALE_OPTIONS: ReadonlyArray<{ tag: SupportedLocale; label: string }> = [
  { tag: 'en', label: 'English' },
  { tag: 'fr', label: 'Français' },
  { tag: 'es', label: 'Español' },
  { tag: 'de', label: 'Deutsch' },
  { tag: 'ja', label: '日本語' },
  { tag: 'zh_Hans', label: '简体中文' },
  { tag: 'zh_Hant', label: '繁體中文' },
];

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
   * Applies a user-selected UI locale from the header picker.
   *
   * @param event Change event from the locale `wa-select`.
   */
  private onLocaleChange = (event: Event): void => {
    const value = readWaSelectValue(event);
    const next = resolveSupportedAppLocale(value);
    if (next === resolveSupportedAppLocale(getAppLocale())) {
      return;
    }
    switchAppLocale(next);
  };

  /**
   * Renders the compact app bar with title, export link, and theme toggle.
   */
  render() {
    const dark = this.theme === 'dark';
    const locale = resolveSupportedAppLocale(getAppLocale());
    return html`
      <div class="app-bar-inner" data-testid="app-shell">
        <div class="app-brand" data-testid="app-shell-title">
          <h1 class="app-title">${appShellI18n.translate(appShellKeys.title)}</h1>
          <p class="app-tagline">${appShellI18n.translate(appShellKeys.tagline)}</p>
        </div>
        <div class="app-bar-actions">
          <wa-button
            data-testid="app-shell-import-link"
            variant="neutral"
            size="small"
            href="#/import"
          >
            <wa-icon name="file-import" aria-hidden="true"></wa-icon>
            ${appShellI18n.translate(appShellKeys.importLink)}
          </wa-button>
          <wa-button
            data-testid="app-shell-export-link"
            variant="neutral"
            size="small"
            href="#/export"
          >
            <wa-icon name="file-export" aria-hidden="true"></wa-icon>
            ${appShellI18n.translate(appShellKeys.exportLink)}
          </wa-button>
          <wa-select
            class="locale-select"
            data-testid="app-shell-locale-select"
            size="small"
            .value=${locale}
            aria-label=${appShellI18n.translate(appShellKeys.localeSelectAriaLabel)}
            @change=${this.onLocaleChange}
            @wa-change=${this.onLocaleChange}
          >
            ${APP_LOCALE_OPTIONS.map(
              ({ tag, label }) => html`<wa-option value=${tag}>${label}</wa-option>`,
            )}
          </wa-select>
          <label class="theme-toggle">
            <wa-icon name=${dark ? 'moon' : 'sun'} aria-hidden="true"></wa-icon>
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
