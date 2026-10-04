/**
 * Tauri SaberStorage — invokes Rust commands for folder pick and safe I/O.
 *
 * @module platform/desktop-bridge
 */

import { invoke } from '@tauri-apps/api/core';
import type { SaberStorage } from './storage.js';

/** Keep path normalization local so the dynamic-import chunk does not pull in the main bundle (avoids a Rollup circular deadlock before `export`). */
function normalizeSaberRelativePath(relative: string): string {
  return relative.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** Desktop implementation backed by `desktop/src-tauri` commands. */
export class TauriSaberStorage implements SaberStorage {
  readonly isDesktop = true;

  async getRoot(): Promise<string | null> {
    return invoke<string | null>('get_root');
  }

  async setRoot(path: string): Promise<void> {
    await invoke('set_root', { path });
  }

  async pickFolder(): Promise<string | null> {
    const picked = await invoke<string | null>('pick_folder');
    if (picked) {
      await this.setRoot(picked);
    }
    return picked;
  }

  async readText(relativePath: string): Promise<string> {
    return invoke<string>('read_text', {
      relativePath: normalizeSaberRelativePath(relativePath),
    });
  }

  async writeText(relativePath: string, content: string): Promise<void> {
    await invoke('write_text', {
      relativePath: normalizeSaberRelativePath(relativePath),
      content,
    });
  }
}
