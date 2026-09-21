/**
 * Board route mount — inserts {@link PoBoardPage}.
 *
 * @module ui/pages/board-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the board selection page (`po-board-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountBoardPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-board-page');
}
