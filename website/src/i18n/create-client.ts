/**
 * Factory helpers for i18n clients.
 *
 * @module i18n/create-client
 */
import { I18nClient } from './client.js';
import type { I18nClientOptions } from './types.js';

/** Create a component-scoped client. Defaults to parenting the application root client. */
export function createI18nClient(options: I18nClientOptions): I18nClient {
  return new I18nClient(options);
}

/** Create the application root client (`parent: null`). */
export function createRootI18nClient(
  options: Omit<I18nClientOptions, 'parent'>,
): I18nClient {
  return new I18nClient({ ...options, parent: null });
}
