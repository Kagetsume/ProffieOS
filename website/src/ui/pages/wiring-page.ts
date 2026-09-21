/**
 * Wiring route mount — inserts {@link PoWiringPage}.
 *
 * @module ui/pages/wiring-page
 */
import '../elements/po-wiring-page.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Wiring page into `root`. */
export function mountWiringPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-wiring-page');
}
