/**
 * i18n keys for {@link PoAppShell}.
 *
 * @module ui/elements/po-app-shell.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const appShellKeys = {
  title: 'title',
  exportLink: 'exportLink',
  darkMode: 'darkMode',
  lightMode: 'lightMode',
  exportRoute: commonKeys.nav.route.export,
} as const;
