/**
 * Ensures every supported locale JSON matches English key sets.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_LOCALES } from './supported-locales.js';

const websiteSrc = path.resolve(import.meta.dirname, '..');

function enLocaleFiles(): { stem: string; enPath: string; localePath: (lang: string) => string }[] {
  const files: { stem: string; enPath: string; localePath: (lang: string) => string }[] = [
    {
      stem: 'common',
      enPath: path.join(websiteSrc, 'i18n/locales/en/common.json'),
      localePath: (lang) => path.join(websiteSrc, 'i18n/locales', lang, 'common.json'),
    },
  ];
  const compDir = path.join(websiteSrc, 'ui/elements/locales');
  for (const name of fs.readdirSync(compDir).filter((f) => f.endsWith('.en.json'))) {
    const stem = name.replace(/\.en\.json$/, '');
    files.push({
      stem,
      enPath: path.join(compDir, name),
      localePath: (lang) => path.join(compDir, `${stem}.${lang}.json`),
    });
  }
  return files;
}

describe('locale bundle parity', () => {
  const files = enLocaleFiles();
  const langs = SUPPORTED_LOCALES.filter((l) => l !== 'en');

  it.each(langs)('%s has the same keys as en for every bundle file', (lang) => {
    for (const { stem, enPath, localePath } of files) {
      const en = JSON.parse(fs.readFileSync(enPath, 'utf8')) as Record<string, string>;
      const localized = JSON.parse(fs.readFileSync(localePath(lang), 'utf8')) as Record<
        string,
        string
      >;
      expect(Object.keys(localized).sort(), `${stem} (${lang})`).toEqual(Object.keys(en).sort());
    }
  });
});
