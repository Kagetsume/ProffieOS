/**
 * Selects browser vs Tauri SaberStorage at application startup.
 *
 * @module platform/init
 */

import { BrowserSaberStorage } from './browser-storage.js';
import { setSaberStorage } from './storage.js';

/**
 * Detects Tauri webview without pulling `@tauri-apps/api` on the public web build.
 */
function runningInTauri(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

/** Installs the platform SaberStorage implementation. */
export async function initPlatformStorage(): Promise<void> {
  if (runningInTauri()) {
    const { TauriSaberStorage } = await import('./desktop-bridge.js');
    setSaberStorage(new TauriSaberStorage());
    return;
  }
  setSaberStorage(new BrowserSaberStorage());
}
