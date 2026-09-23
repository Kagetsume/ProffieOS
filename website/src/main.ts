/**
 * Application entry point.
 *
 * Loads Web Awesome styles/components, registers hash routes, and starts the router.
 * No React — routes mount Lit page elements into `#page-root`.
 *
 * @module main
 */
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';

import './app.css';
import { initTheme } from './ui/theme.js';
import './ui/elements/index.js';
import { ROUTE_CATALOG, type RouteId } from './route-config';
import { registerRoute, startRouter } from './router';
import { mountHomePage } from './ui/pages/home-page';
import { mountBoardPage } from './ui/pages/board-page';
import { mountExportPage } from './ui/pages/export-page';
import { mountFeaturesPage } from './ui/pages/features-page';
import { mountPresetsPage } from './ui/pages/presets-page';
import { mountStylesPage } from './ui/pages/styles-page';
import { mountWiringPage } from './ui/pages/wiring-page';

const PAGE_MOUNTS: Record<RouteId, (root: HTMLElement) => () => void> = {
  home: mountHomePage,
  board: mountBoardPage,
  features: mountFeaturesPage,
  blades: mountWiringPage,
  presets: mountPresetsPage,
  styles: mountStylesPage,
  export: mountExportPage,
};

for (const meta of ROUTE_CATALOG) {
  registerRoute({
    id: meta.id,
    label: meta.label,
    mount: PAGE_MOUNTS[meta.id],
  });
}

initTheme();

const pageRoot = document.querySelector<HTMLElement>('#page-root')!;

startRouter(pageRoot);
