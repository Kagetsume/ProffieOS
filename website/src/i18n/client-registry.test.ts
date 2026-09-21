/**
 * Tests for root client parent registration.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { getDefaultParentClient, registerRootClient } from './client-registry.js';
import { createI18nClient, createRootI18nClient, rootI18n } from './index.js';

describe('client-registry', () => {
  afterEach(() => {
    registerRootClient(rootI18n);
  });

  it('returns rootI18n as the default parent after module init', () => {
    expect(getDefaultParentClient()).toBe(rootI18n);
  });

  it('allows replacing the registered root client', () => {
    const customRoot = createRootI18nClient({
      locale: 'de',
      bundles: { de: { 'test.key': 'Wert' } },
    });

    registerRootClient(customRoot);
    expect(getDefaultParentClient()).toBe(customRoot);

    const child = createI18nClient({ locale: 'de', bundles: { de: {} } });
    expect(child.translate('test.key')).toBe('Wert');
  });
});
