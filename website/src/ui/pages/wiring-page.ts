/**
 * Wiring route mount — inserts {@link PoWiringPage} custom element.
 *
 * @module ui/pages/wiring-page
 */
import '../elements/index.js';

/**
 * Mount the Wiring page into `root`.
 *
 * @returns Cleanup — removes the custom element from the DOM
 */
export function mountWiringPage(root: HTMLElement): () => void {
  root.innerHTML = '<po-wiring-page></po-wiring-page>';
  return () => {
    root.innerHTML = '';
  };
}
