/**
 * Export route mount — inserts {@link PoExportPage}.
 *
 * @module ui/pages/export-page
 */
import '../elements/po-export-page.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the config export page (`po-export-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountExportPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-export-page');
}
