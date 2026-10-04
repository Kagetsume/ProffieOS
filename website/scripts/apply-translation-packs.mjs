/**
 * Apply `scripts/translations/<locale>.mjs` packs to `src/` locale JSON files.
 * Run from website/: node scripts/apply-translation-packs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.join(__dirname, '..');
const srcRoot = path.join(websiteRoot, 'src');

const packs = [
  ['fr', await import('./translations/fr.mjs')],
  ['es', await import('./translations/es.mjs')],
  ['de', await import('./translations/de.mjs')],
  ['ja', await import('./translations/ja.mjs')],
  ['zh_Hans', await import('./translations/zh_Hans.mjs')],
  ['zh_Hant', await import('./translations/zh_Hant.mjs')],
];

function loadEnStems() {
  /** @type {string[]} */
  const stems = ['common'];
  const compDir = path.join(srcRoot, 'ui/elements/locales');
  for (const name of fs.readdirSync(compDir).filter((f) => f.endsWith('.en.json'))) {
    stems.push(name.replace(/\.en\.json$/, ''));
  }
  return stems;
}

const stems = loadEnStems();

for (const [lang, mod] of packs) {
  const pack = mod.default;
  for (const stem of stems) {
    const enPath =
      stem === 'common'
        ? path.join(srcRoot, 'i18n/locales/en/common.json')
        : path.join(srcRoot, 'ui/elements/locales', `${stem}.en.json`);
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const translated = pack[stem];
    if (!translated) {
      throw new Error(`Pack ${lang} missing stem ${stem}`);
    }
    for (const key of Object.keys(en)) {
      if (!(key in translated)) {
        throw new Error(`Pack ${lang} stem ${stem} missing key ${key}`);
      }
    }
    for (const key of Object.keys(translated)) {
      if (!(key in en)) {
        throw new Error(`Pack ${lang} stem ${stem} extra key ${key}`);
      }
    }
    const outPath =
      stem === 'common'
        ? path.join(srcRoot, 'i18n/locales', lang, 'common.json')
        : path.join(srcRoot, 'ui/elements/locales', `${stem}.${lang}.json`);
    if (stem === 'common') {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }
    fs.writeFileSync(outPath, `${JSON.stringify(translated, null, 2)}\n`, 'utf8');
  }
}

console.log('Applied translation packs:', packs.map(([l]) => l).join(', '));
