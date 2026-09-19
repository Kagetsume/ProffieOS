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
import './ui/elements/index.js';
import { registerRoute, startRouter } from './router';
import { mountExportPage } from './ui/pages/export-page';
import { mountWiringPage } from './ui/pages/wiring-page';

registerRoute({ id: 'wiring', hash: '#/wiring', label: 'Wiring', mount: mountWiringPage });
registerRoute({ id: 'export', hash: '#/export', label: 'Export', mount: mountExportPage });

const pageRoot = document.querySelector<HTMLElement>('#page-root')!;
const navRoot = document.querySelector<HTMLElement>('#nav')!;

startRouter(pageRoot, navRoot);
