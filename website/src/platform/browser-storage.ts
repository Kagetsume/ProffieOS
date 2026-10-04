/**
 * Browser SaberStorage — no direct SD access; download-only helper for writes.
 *
 * @module platform/browser-storage
 */

import { normalizeSaberRelativePath } from './saber-paths.js';
import type { SaberStorage } from './storage.js';

/** In-browser stub until File System Access or desktop shell is wired. */
export class BrowserSaberStorage implements SaberStorage {
  readonly isDesktop = false;

  async getRoot(): Promise<string | null> {
    return null;
  }

  async setRoot(_path: string): Promise<void> {
    throw new Error('Saber root is only available in the desktop app');
  }

  async pickFolder(): Promise<string | null> {
    return null;
  }

  async readText(_relativePath: string): Promise<string> {
    throw new Error('Reading saber files requires the desktop app');
  }

  async writeText(relativePath: string, content: string): Promise<void> {
    const filename = normalizeSaberRelativePath(relativePath).split('/').pop() ?? 'download.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
