/**
 * Presets route — `config/presets.ini`.
 *
 * @module ui/pages/presets-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the presets editor page (`po-presets-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountPresetsPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-presets-page');
}
