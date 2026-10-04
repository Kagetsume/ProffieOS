/**
 * Export route mount — inserts {@link LbExportPage}.
 *
 * @module ui/pages/export-page
 */
import '../elements/lb-export-page.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the config export page (`lb-export-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountExportPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'lb-export-page');
}
