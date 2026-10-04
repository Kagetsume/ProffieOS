/**
 * i18n keys for {@link PoAppShell}.
 *
 * @module ui/elements/po-app-shell.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const appShellKeys = {
  title: 'title',
  tagline: 'tagline',
  exportLink: 'exportLink',
  darkMode: 'darkMode',
  lightMode: 'lightMode',
  localeSelectAriaLabel: 'localeSelectAriaLabel',
  exportRoute: commonKeys.nav.route.export,
} as const;
