/**
 * Root client registry — default parent for component-scoped i18n clients.
 *
 * @module i18n/client-registry
 */
import type { I18nClient } from './client.js';

let defaultParentClient: I18nClient | null = null;

/** Register the application root client (parent of all default child clients). */
export function registerRootClient(client: I18nClient): void {
  defaultParentClient = client;
}

/** Parent used when {@link I18nClientOptions.parent} is omitted. */
export function getDefaultParentClient(): I18nClient | null {
  return defaultParentClient;
}
