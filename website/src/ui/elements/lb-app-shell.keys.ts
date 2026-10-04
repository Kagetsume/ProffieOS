/**
 * i18n keys for {@link LbAppShell}.
 *
 * @module ui/elements/lb-app-shell.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const appShellKeys = {
  title: 'title',
  tagline: 'tagline',
  importLink: 'importLink',
  exportLink: 'exportLink',
  darkMode: 'darkMode',
  lightMode: 'lightMode',
  localeSelectAriaLabel: 'localeSelectAriaLabel',
  importRoute: commonKeys.nav.route.import,
  exportRoute: commonKeys.nav.route.export,
} as const;
