/**
 * Saber (SD card) file access port — browser stub vs Tauri desktop bridge.
 *
 * @module platform/storage
 */

/** Read/write text files under a user-chosen saber root. */
export interface SaberStorage {
  /** Whether this implementation can access the local filesystem. */
  readonly isDesktop: boolean;

  /** Current saber root directory, if set. */
  getRoot(): Promise<string | null>;

  /** Sets saber root (desktop: must exist on disk). */
  setRoot(path: string): Promise<void>;

  /** Opens a native folder picker (desktop only). */
  pickFolder(): Promise<string | null>;

  /** Reads UTF-8 text at a path relative to saber root. */
  readText(relativePath: string): Promise<string>;

  /** Writes UTF-8 text at a path relative to saber root. */
  writeText(relativePath: string, content: string): Promise<void>;
}

let activeStorage: SaberStorage | null = null;

/** Registers the active storage implementation (called once at startup). */
export function setSaberStorage(storage: SaberStorage): void {
  activeStorage = storage;
}

/** Returns the active storage implementation. */
export function getSaberStorage(): SaberStorage {
  if (!activeStorage) {
    throw new Error('SaberStorage not initialized — call initPlatformStorage() first');
  }
  return activeStorage;
}

/** True when running with a desktop filesystem backend. */
export function isDesktopStorage(): boolean {
  return activeStorage?.isDesktop ?? false;
}
