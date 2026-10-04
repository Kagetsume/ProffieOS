/**
 * Import route mount — inserts {@link PoImportPage}.
 *
 * @module ui/pages/import-page
 */
import '../elements/po-import-page.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the saber config import page (`po-import-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountImportPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-import-page');
}
