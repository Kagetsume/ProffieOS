/**
 * Board route mount — inserts {@link PoBoardPage}.
 *
 * @module ui/pages/board-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Board page into `root`. */
export function mountBoardPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-board-page');
}
