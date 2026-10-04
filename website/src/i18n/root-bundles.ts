/**
 * Root {@link rootI18n} message bundles for all supported locales.
 *
 * @module i18n/root-bundles
 */
import deCommon from './locales/de/common.json';
import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';
import frCommon from './locales/fr/common.json';
import jaCommon from './locales/ja/common.json';
import rootCommon from './locales/root/common.json';
import zhHansCommon from './locales/zh_Hans/common.json';
import zhHantCommon from './locales/zh_Hant/common.json';
import { applyLocaleAliases } from './supported-locales.js';
import type { I18nLocaleBundles } from './types.js';

/** Full bundle map for the application root client (includes `root` fallback). */
export function buildRootLocaleBundles(): I18nLocaleBundles {
  return applyLocaleAliases({
    root: rootCommon,
    en: enCommon,
    fr: frCommon,
    es: esCommon,
    de: deCommon,
    ja: jaCommon,
    zh_Hans: zhHansCommon,
    zh_Hant: zhHantCommon,
  });
}
