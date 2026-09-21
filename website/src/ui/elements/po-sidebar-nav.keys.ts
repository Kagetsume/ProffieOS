/**
 * i18n keys for {@link PoSidebarNav}.
 *
 * @module ui/elements/po-sidebar-nav.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';
import type { RouteId } from '../../route-config.js';

export const sidebarNavKeys = {
  navAriaLabel: commonKeys.nav.ariaLabel,
  navConfigFiles: commonKeys.nav.configFiles,
  navOutput: commonKeys.nav.output,
  navStubSoon: commonKeys.nav.stubSoon,
} as const;

export const sidebarNavRouteKeys: Record<RouteId, (typeof commonKeys.nav.route)[keyof typeof commonKeys.nav.route]> =
  {
    home: commonKeys.nav.route.home,
    board: commonKeys.nav.route.board,
    features: commonKeys.nav.route.features,
    blades: commonKeys.nav.route.blades,
    styles: commonKeys.nav.route.styles,
    presets: commonKeys.nav.route.presets,
    export: commonKeys.nav.route.export,
  };
