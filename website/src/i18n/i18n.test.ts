/**
 * Tests for i18n client, substitution, and sanitization.
 */
import { describe, expect, it } from 'vitest';
import { getAppLocale } from './resolve-locale.js';
import { createI18nClient, createRootI18nClient, rootI18n } from './index.js';

describe('I18nClient', () => {
  const local = createI18nClient({
    locale: 'en',
    bundles: {
      en: {
        'panel.title': 'Blade ${index}',
        'panel.note': 'Safe text',
      },
    },
  });

  it('translates a local key', () => {
    expect(local.translate('panel.note')).toBe('Safe text');
  });

  it('falls back to the root client for shared keys by default', () => {
    expect(local.translate('actions.copy')).toBe('Copy');
  });

  it('returns the key when nothing matches', () => {
    expect(local.translate('missing.key')).toBe('missing.key');
  });

  it('substitutes ${variables} from the map', () => {
    expect(local.translate('panel.title', { index: 2 })).toBe('Blade 2');
  });

  it('leaves unknown ${variables} in the string', () => {
    expect(local.translate('panel.title', {})).toBe('Blade ${index}');
  });

  it('ignores substitution keys that are not referenced', () => {
    expect(local.translate('panel.note', { unused: 'x' })).toBe('Safe text');
  });

  it('sanitizes hazardous HTML in templates and substitution values', () => {
    const client = createI18nClient({
      locale: 'en',
      parent: null,
      bundles: {
        en: {
          'xss.template': 'Hello ${name}',
          'xss.static': '<img src=x onerror=alert(1)>',
        },
      },
    });

    expect(
      client.translate('xss.template', { name: '<script>alert(1)</script>' }),
    ).toBe('Hello ');

    expect(client.translate('xss.template', { name: '<em>World</em>' })).toBe('Hello World');

    expect(client.translate('xss.static')).toBe('');
  });

  it('supports root hint substitution from common.json', () => {
    expect(rootI18n.translate('hint.exportFooter', { filename: 'board.ini' })).toBe(
      'Changes appear on the Export page as board.ini.',
    );
  });

  it('resolves locale bundles in en_US → en → root order', () => {
    const client = createRootI18nClient({
      locale: 'en_US',
      bundles: {
        root: { shared: 'root-value', 'only.root': 'root-only' },
        en: { shared: 'en-value', 'only.en': 'en-only' },
        en_US: { shared: 'us-value', 'only.us': 'us-only' },
      },
    });

    expect(client.translate('only.us')).toBe('us-only');
    expect(client.translate('only.en')).toBe('en-only');
    expect(client.translate('only.root')).toBe('root-only');
    expect(client.translate('shared')).toBe('us-value');
  });

  it('falls back from en_US to en when a regional bundle is missing', () => {
    const client = createRootI18nClient({
      locale: 'en_US',
      bundles: {
        root: { shared: 'root-value' },
        en: { shared: 'en-value', 'only.en': 'from-en' },
      },
    });

    expect(client.translate('only.en')).toBe('from-en');
    expect(client.translate('shared')).toBe('en-value');
  });

  it('walks parent clients after local bundles are exhausted', () => {
    const parent = createRootI18nClient({
      locale: 'en_US',
      bundles: {
        en_US: { 'parent.key': 'parent-us' },
        en: { 'parent.key': 'parent-en' },
      },
    });

    const child = createI18nClient({
      locale: 'en_US',
      parent,
      bundles: {
        en: { 'child.key': 'child-en' },
        root: { 'child.key': 'child-root' },
      },
    });

    expect(child.translate('child.key')).toBe('child-en');
    expect(child.translate('parent.key')).toBe('parent-us');
    expect(child.parent).toBe(parent);
  });

  it('uses the registered root client when parent is omitted', () => {
    const child = createI18nClient({
      locale: 'en',
      bundles: { en: {} },
    });

    expect(child.parent).toBe(rootI18n);
    expect(child.translate('actions.copy')).toBe('Copy');
  });

  it('allows an explicit null parent without walking to root', () => {
    const isolated = createI18nClient({
      locale: 'en',
      parent: null,
      bundles: { en: {} },
    });

    expect(isolated.parent).toBeNull();
    expect(isolated.translate('actions.copy')).toBe('actions.copy');
  });

  it('lets a component override a root string without affecting root', () => {
    const child = createI18nClient({
      locale: 'en',
      bundles: { en: { 'actions.copy': 'Copy locally' } },
    });

    expect(child.translate('actions.copy')).toBe('Copy locally');
    expect(rootI18n.translate('actions.copy')).toBe('Copy');
  });

  it('resolveRaw returns the template without substitution', () => {
    expect(local.resolveRaw('panel.title')).toBe('Blade ${index}');
  });

  it('setBundles replaces message tables', () => {
    const client = createRootI18nClient({
      locale: 'en',
      bundles: { en: { key: 'before' } },
    });

    client.setBundles({ en: { key: 'after' } });
    expect(client.translate('key')).toBe('after');
  });

  it('setLocale on root client updates app locale for formatters', () => {
    const client = createRootI18nClient({
      locale: 'en',
      bundles: { en: { key: 'value' } },
    });

    client.setLocale('de', { de: { key: 'Wert' } });
    expect(client.locale).toBe('de');
    expect(getAppLocale()).toBe('de');
    expect(client.translate('key')).toBe('Wert');
  });

  it('normalizes hyphenated locale tags on construction', () => {
    const client = createRootI18nClient({
      locale: 'en-US',
      bundles: { en_US: { key: 'us' }, en: { key: 'en' } },
    });

    expect(client.locale).toBe('en_US');
    expect(client.translate('key')).toBe('us');
  });

  it('walks a multi-level parent chain', () => {
    const grandparent = createRootI18nClient({
      locale: 'en',
      bundles: { en: { level: 'grandparent' } },
    });

    const parent = createI18nClient({
      locale: 'en',
      parent: grandparent,
      bundles: { en: {} },
    });

    const child = createI18nClient({
      locale: 'en',
      parent,
      bundles: { en: {} },
    });

    expect(child.translate('level')).toBe('grandparent');
  });
});
