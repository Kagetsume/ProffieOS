/**
 * Route metadata for sidebar navigation and page stubs.
 *
 * @module route-config
 */

/** Application hash routes. */
export type RouteId = 'home' | 'board' | 'features' | 'blades' | 'presets' | 'styles' | 'export';

/** Sidebar grouping. */
export type RouteGroup = 'intro' | 'config' | 'tools';

/** Static route metadata (mount functions registered separately in `main.ts`). */
export type RouteMeta = {
  id: RouteId;
  label: string;
  sdPath?: string;
  group: RouteGroup;
  description: string;
  /** Stub pages show a phase note in the sidebar. */
  stub?: boolean;
};

/** Legacy hash alias → current route id. */
export const ROUTE_ALIASES: Record<string, RouteId> = {
  wiring: 'blades',
};

/** Default route when hash is empty or unknown. */
export const DEFAULT_ROUTE_ID: RouteId = 'home';

/** All routes (sidebar order). */
export const ROUTE_CATALOG: readonly RouteMeta[] = [
  {
    id: 'home',
    label: 'Overview',
    group: 'intro',
    description: 'What this editor is for and how to use it.',
  },
  {
    id: 'board',
    label: 'Board',
    sdPath: 'config/board.ini',
    group: 'config',
    description: 'Button count, OLED, and Bluetooth serial.',
  },
  {
    id: 'features',
    label: 'Features',
    sdPath: 'config/features.ini',
    group: 'config',
    description: 'Gesture and twist on/off — overrides the same keys from board.ini when present.',
  },
  {
    id: 'blades',
    label: 'Blades',
    sdPath: 'config/blades.ini',
    group: 'config',
    description: 'NeoPixel and simple accent wiring — data pins, pixels, power FETs.',
  },
  {
    id: 'styles',
    label: 'Blade styles',
    sdPath: 'config/blade_styles.ini',
    group: 'config',
    description: 'Layer recipes referenced by presets (`config <section>`).',
  },
  {
    id: 'presets',
    label: 'Presets',
    sdPath: 'config/presets.ini',
    group: 'config',
    description: 'Font, track, preset name, and one style line per blade.',
    stub: true,
  },
  {
    id: 'export',
    label: 'Export',
    group: 'tools',
    description: 'Preview, copy, and download generated INI files.',
  },
] as const;

export function getRouteMeta(id: RouteId): RouteMeta | undefined {
  return ROUTE_CATALOG.find((route) => route.id === id);
}

export function introRoutes(): readonly RouteMeta[] {
  return ROUTE_CATALOG.filter((route) => route.group === 'intro');
}

export function configRoutes(): readonly RouteMeta[] {
  return ROUTE_CATALOG.filter((route) => route.group === 'config');
}

export function toolRoutes(): readonly RouteMeta[] {
  return ROUTE_CATALOG.filter((route) => route.group === 'tools');
}
