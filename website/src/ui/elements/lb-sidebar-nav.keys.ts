/**
 * i18n keys for {@link LbSidebarNav}.
 *
 * @module ui/elements/lb-sidebar-nav.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';
import type { RouteId } from '../../route-config.js';

export const sidebarNavKeys = {
  navAriaLabel: commonKeys.nav.ariaLabel,
  navConfigFiles: commonKeys.nav.configFiles,
  navOutput: commonKeys.nav.output,
  navStubSoon: commonKeys.nav.stubSoon,
  toggleCollapseAriaLabel: 'toggleCollapseAriaLabel',
  toggleExpandAriaLabel: 'toggleExpandAriaLabel',
} as const;

export const sidebarNavRouteKeys: Record<RouteId, (typeof commonKeys.nav.route)[keyof typeof commonKeys.nav.route]> =
  {
    home: commonKeys.nav.route.home,
    board: commonKeys.nav.route.board,
    features: commonKeys.nav.route.features,
    blades: commonKeys.nav.route.blades,
    styles: commonKeys.nav.route.styles,
    presets: commonKeys.nav.route.presets,
    import: commonKeys.nav.route.import,
    export: commonKeys.nav.route.export,
  };
