/**
 * Export route mount — inserts {@link PoExportPage}.
 *
 * @module ui/pages/export-page
 */
import '../elements/po-export-page.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Export page into `root`. */
export function mountExportPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-export-page');
}
