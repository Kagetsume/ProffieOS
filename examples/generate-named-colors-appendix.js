#!/usr/bin/env node
/**
 * Builds three-scope color reference fragments for config-layers docs:
 *   A — ParseColorName (SD / layer tokens)
 *   B — Fett263 Edit Mode color_list_ (voice ColorNumber)
 *   C — Editor catalog extended + vivid (not firmware names)
 *
 * Run from repo root: node examples/generate-named-colors-appendix.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const COLORS_H = path.join(REPO_ROOT, 'styles', 'colors.h');
const FETT263_SOURCE = path.join(REPO_ROOT, 'props', 'saber_fett263_buttons.h');
const SOUND_LIBRARY = path.join(REPO_ROOT, 'sound', 'sound_library.h');
const CATALOG_JSON = path.join(REPO_ROOT, 'website', 'src', 'catalog', 'colors.json');
const PARSE_COLOR_TABLE = path.join(REPO_ROOT, 'styles', 'parse_color_arg_table.generated.h');
const APPENDIX_MD = path.join(__dirname, 'config-layers-named-colors-appendix.md');
const COLOR_CARD_MD = path.join(__dirname, 'config-layers-color-card.md');
const USER_GUIDE_MD = path.join(__dirname, 'config-layers-user-guide.md');

const RGB_TYPEDEF_RE = /typedef\s+Rgb<(\d+),\s*(\d+),\s*(\d+)>\s+(\w+);/g;

const SCOPE_A = 'SD name';
const SCOPE_B = 'Edit menu only; save as r,g,b on SD';
const SCOPE_C = 'Not SD names; use r,g,b or #hex in INI';

const PARSE_COLOR_ENTRY_RE = /\{"([^"]+)",\s*(\d+),\s*(\d+),\s*(\d+)\}/g;

/** SD/layer tokens from the committed firmware table (run tools/generate-parse-color-names.js first). */
function parseSdColorsFromGeneratedHeader() {
  const source = fs.readFileSync(PARSE_COLOR_TABLE, 'utf8');
  const tableStart = source.indexOf('parse_color_name_table[]');
  if (tableStart < 0) {
    throw new Error('parse_color_name_table not found in parse_color_arg_table.generated.h');
  }
  const colors = [];
  let m;
  const slice = source.slice(tableStart);
  while ((m = PARSE_COLOR_ENTRY_RE.exec(slice)) !== null) {
    colors.push({
      name: m[1],
      r: Number(m[2]),
      g: Number(m[3]),
      b: Number(m[4]),
    });
  }
  if (colors.length === 0) {
    throw new Error('No entries parsed from parse_color_arg_table.generated.h');
  }
  return colors;
}

function normNameKey(name) {
  return name.toLowerCase();
}

function parseColorsH(sourceText) {
  const map = new Map();
  let m;
  while ((m = RGB_TYPEDEF_RE.exec(sourceText)) !== null) {
    map.set(m[4], { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) });
  }
  return map;
}

function c16ChannelTo8(v) {
  return v > 255 ? Math.round(v / 257) : v;
}

function parseColorNumberVoiceLabels(sourceText) {
  const labels = new Map();
  const enumStart = sourceText.indexOf('enum ColorNumber');
  if (enumStart < 0) throw new Error('ColorNumber enum not found');
  const enumBody = sourceText.slice(enumStart, enumStart + 1200);
  const re = /COLOR_(\w+)\s*=\s*(\d+)/g;
  let m;
  while ((m = re.exec(enumBody)) !== null) {
    const key = `COLOR_${m[1]}`;
    labels.set(key, { number: Number(m[2]), voice: m[1] });
  }
  return labels;
}

function voiceDisplayName(voiceKey) {
  const special = {
    ORANGERED: 'OrangeRed',
    DARKORANGE: 'DarkOrange',
    GREENYELLOW: 'GreenYellow',
    AQUAMARINE: 'AquaMarine',
    DEEPSKYBLUE: 'DeepSkyBlue',
    DODGERBLUE: 'DodgerBlue',
    ICEBLUE: 'IceBlue',
    DEEPPURPLE: 'DeepPurple',
    DEEPPINK: 'DeepPink',
    ICEWHITE: 'IceWhite',
    LIGHTCYAN: 'LightCyan',
    LEMONCHIFFON: 'LemonChiffon',
    NAVAJOWHITE: 'NavajoWhite',
  };
  if (special[voiceKey]) return special[voiceKey];
  return voiceKey.charAt(0) + voiceKey.slice(1).toLowerCase();
}

function parseFett263ColorList(sourceText, colorsH) {
  const listStart = sourceText.indexOf('static constexpr ColorListEntry color_list_[]');
  if (listStart < 0) throw new Error('color_list_ not found in saber_fett263_buttons.h');
  const braceStart = sourceText.indexOf('{', listStart);
  let depth = 0;
  let i = braceStart;
  for (; i < sourceText.length; i++) {
    if (sourceText[i] === '{') depth++;
    else if (sourceText[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = sourceText.slice(braceStart + 1, i);
  const lineRe =
    /\{\s*(?:([A-Za-z]+)::color\(\)|\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\})\s*,\s*(COLOR_\w+)\s*\}/g;
  const entries = [];
  let m;
  while ((m = lineRe.exec(body)) !== null) {
    let r;
    let g;
    let b;
    if (m[1]) {
      const rgb = colorsH.get(m[1]);
      if (!rgb) {
        throw new Error(`Unknown color type ${m[1]} in color_list_ (check styles/colors.h)`);
      }
      ({ r, g, b } = rgb);
    } else {
      r = c16ChannelTo8(Number(m[2]));
      g = c16ChannelTo8(Number(m[3]));
      b = c16ChannelTo8(Number(m[4]));
    }
    entries.push({ colorNumber: m[5], r, g, b });
  }
  if (entries.length === 0) {
    throw new Error('No entries parsed from Fett263 color_list_');
  }
  return entries;
}

function parseCatalogExtras() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, 'utf8'));
  const colors = [...catalog.extended, ...catalog.vivid];
  if (colors.length === 0) {
    throw new Error('No extended/vivid colors in colors.json');
  }
  return colors.map((c) => ({
    name: c.name,
    r: c.r,
    g: c.g,
    b: c.b,
  }));
}

function hexRgb(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function swatchInline(r, g, b) {
  const bg = hexRgb(r, g, b);
  return `<span class="color-swatch" style="background-color:${bg};" title="${bg}"></span>`;
}

function appendixIntro(generatedAt, counts) {
  return `## Appendix: Named colors

ProffieOS color names fall into **three scopes**, matching the LayerBlade editor catalog:

- **SD and layer tokens** (\`styles/parse_color_arg_table.generated.h\`, merged catalog + Fett263) — names you can type in \`blade_styles.ini\`, \`layer =\` lines, and \`{{placeholder}}\` overrides. Firmware resolves them with \`ParseColorName\` in \`styles/parse_color_arg.h\`. Regenerate the table with \`node tools/generate-parse-color-names.js\`.
- **Fett263 Edit Mode list** (\`props/saber_fett263_buttons.h\` \`color_list_\`) — the on-saber color picker when Fett263 props are enabled. Voice labels come from \`ColorNumber\` in \`sound/sound_library.h\`. Choosing a color **rewrites the preset as \`r,g,b\`**; many of the same colors also work as text names in Section A after you flash a build with the generated table.
- **Editor catalog extras** (Section C, if any) — names in \`colors.json\` extended + vivid that are **not** in the firmware table. Use \`r,g,b\` or \`#hex\` in INI for those; when Section C is empty, every catalog name is already in Section A.

You can always use \`r,g,b\` (channels **0–255**) or \`#RRGGBB\` / \`#RGB\` hex anywhere a color argument is accepted. Matching for SD names is **case-insensitive**.

Generated **${generatedAt}** · Section A: ${counts.a} · Section B: ${counts.b} · Section C: ${counts.c}. Re-run \`node examples/generate-named-colors-appendix.js\` and rebuild the PDFs after firmware or catalog changes.

`;
}

function appendixSectionA(colors) {
  const rows = colors
    .map(
      (c) =>
        `| ${swatchInline(c.r, c.g, c.b)} | \`${c.name}\` | ${c.r}, ${c.g}, ${c.b} | ${hexRgb(c.r, c.g, c.b)} | ${SCOPE_A} |`
    )
    .join('\n');

  return `### Section A — SD and layer tokens

Source: \`styles/parse_color_arg_table.generated.h\` (\`ParseColorName\`).

| Swatch | Name | Rgb (0–255) | Hex | Scope |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function appendixSectionB(entries, voiceLabels) {
  const rows = entries
    .map((e) => {
      const meta = voiceLabels.get(e.colorNumber);
      const num = meta ? meta.number : '?';
      const voice = meta ? voiceDisplayName(meta.voice) : e.colorNumber;
      return `| ${swatchInline(e.r, e.g, e.b)} | ${num} | ${voice} | ${e.r}, ${e.g}, ${e.b} | ${hexRgb(e.r, e.g, e.b)} | ${SCOPE_B} |`;
    })
    .join('\n');

  return `### Section B — Fett263 Edit Mode color list

Source: \`props/saber_fett263_buttons.h\` \`color_list_\` · voice: \`sound_library.h\` \`ColorNumber\` (\`SayColor\`).

| Swatch | # | Voice label | Rgb (0–255) | Hex | Scope |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function appendixSectionC(colors) {
  const rows = colors
    .map(
      (c) =>
        `| ${swatchInline(c.r, c.g, c.b)} | \`${c.name}\` | ${c.r}, ${c.g}, ${c.b} | ${hexRgb(c.r, c.g, c.b)} | ${SCOPE_C} |`
    )
    .join('\n');

  return `### Section C — Editor catalog extras

Source: \`website/src/catalog/colors.json\` (extended + vivid). Same vivid typedefs live in \`styles/colors.h\`.

| Swatch | Editor name | Rgb (0–255) | Hex | Scope |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function colorCardCell(c, labelHtml, metaExtra) {
  const bg = hexRgb(c.r, c.g, c.b);
  const light = c.r * 0.299 + c.g * 0.587 + c.b * 0.114 > 160;
  const textClass = light ? 'color-card-label color-card-label-dark' : 'color-card-label';
  const meta = metaExtra ? `<div class="color-card-meta">${metaExtra}</div>` : '';
  return `<div class="color-card-cell">
  ${swatchInline(c.r, c.g, c.b)}
  <div class="${textClass}">${labelHtml}</div>
  <div class="color-card-meta">${c.r}, ${c.g}, ${c.b}</div>
  ${meta}
</div>`;
}

function colorCardGrid(cells, gridClass) {
  return `<div class="color-grid ${gridClass}">\n${cells}\n</div>`;
}

function colorCardDocument(sectionA, fett263Entries, voiceLabels, catalogExtras, generatedAt) {
  const cellsA = sectionA
    .map((c) => colorCardCell(c, `<code>${c.name}</code>`, SCOPE_A))
    .join('\n');

  const cellsB = fett263Entries
    .map((e) => {
      const meta = voiceLabels.get(e.colorNumber);
      const voice = meta ? voiceDisplayName(meta.voice) : e.colorNumber;
      const num = meta ? meta.number : '';
      return colorCardCell(e, `<code>${voice}</code>`, `#${num} · ${SCOPE_B}`);
    })
    .join('\n');

  const cellsC = catalogExtras
    .map((c) => colorCardCell(c, `<code>${c.name}</code>`, SCOPE_C))
    .join('\n');

  const counts = {
    a: sectionA.length,
    b: fett263Entries.length,
    c: catalogExtras.length,
  };

  return `<div class="title-page color-card-title">
  <h1>Color reference</h1>
  <p class="subtitle">Proffie – LayerBlade · three scopes</p>
  <hr class="rule" />
  <p class="purpose">Section <strong>A</strong>: SD/layer names (\`ParseColorName\`, full merged catalog). Section <strong>B</strong>: Fett263 Edit Mode picker (saved as \`r,g,b\`). Section <strong>C</strong>: catalog names not in A (if any). Hex and \`r,g,b\` always work.</p>
  <p class="meta">Generated ${generatedAt} · A: ${counts.a} · B: ${counts.b} · C: ${counts.c}</p>
</div>

<section class="color-card-section">
  <h2 class="color-card-section-title">Section A — SD &amp; layer tokens</h2>
  <p class="color-card-section-lead">${SCOPE_A} · <code>parse_color_arg_table.generated.h</code></p>
${colorCardGrid(cellsA, 'color-card-grid')}
</section>

<div class="page-break"></div>

<section class="color-card-section">
  <h2 class="color-card-section-title">Section B — Fett263 Edit Mode</h2>
  <p class="color-card-section-lead">Voice <code>ColorNumber</code> · ${SCOPE_B}</p>
${colorCardGrid(cellsB, 'color-card-grid color-card-grid-sm')}
</section>

${
    catalogExtras.length
      ? `<div class="page-break"></div>

<section class="color-card-section">
  <h2 class="color-card-section-title">Section C — Editor catalog extras</h2>
  <p class="color-card-section-lead"><code>colors.json</code> extended + vivid · ${SCOPE_C}</p>
${colorCardGrid(cellsC, 'color-card-grid color-card-grid-sm')}
</section>`
      : ''
  }
`;
}

function spliceUserGuide(guideText, appendixBody) {
  const start = '<!-- NAMED_COLORS_APPENDIX -->';
  const end = '<!-- /NAMED_COLORS_APPENDIX -->';
  const block = `${start}\n${appendixBody}\n${end}`;
  if (guideText.includes(start) && guideText.includes(end)) {
    const re = new RegExp(`${start}[\\s\\S]*?${end}`, 'm');
    return guideText.replace(re, block);
  }
  const insertion = `\n<div class="page-break"></div>\n\n${block}\n`;
  return guideText.trimEnd() + insertion;
}

function main() {
  const sectionA = parseSdColorsFromGeneratedHeader();
  const sdNameKeys = new Set(sectionA.map((c) => normNameKey(c.name)));

  const colorsH = parseColorsH(fs.readFileSync(COLORS_H, 'utf8'));
  const voiceLabels = parseColorNumberVoiceLabels(fs.readFileSync(SOUND_LIBRARY, 'utf8'));
  const sectionB = parseFett263ColorList(fs.readFileSync(FETT263_SOURCE, 'utf8'), colorsH);

  const sectionC = parseCatalogExtras().filter((c) => !sdNameKeys.has(normNameKey(c.name)));

  const generatedAt = new Date().toISOString().slice(0, 10);

  const appendix =
    appendixIntro(generatedAt, {
      a: sectionA.length,
      b: sectionB.length,
      c: sectionC.length,
    }) +
    appendixSectionA(sectionA) +
    '\n' +
    appendixSectionB(sectionB, voiceLabels) +
    (sectionC.length ? '\n' + appendixSectionC(sectionC) : '');

  fs.writeFileSync(APPENDIX_MD, appendix, 'utf8');

  const card = colorCardDocument(sectionA, sectionB, voiceLabels, sectionC, generatedAt);
  fs.writeFileSync(COLOR_CARD_MD, card, 'utf8');

  let guide = fs.readFileSync(USER_GUIDE_MD, 'utf8');
  guide = spliceUserGuide(guide, appendix);
  fs.writeFileSync(USER_GUIDE_MD, guide, 'utf8');

  console.log(`Section A (SD names): ${sectionA.length}`);
  console.log(`Section B (Fett263 menu): ${sectionB.length}`);
  console.log(`Section C (catalog extras): ${sectionC.length}`);
  console.log(`Wrote ${path.relative(REPO_ROOT, APPENDIX_MD)}`);
  console.log(`Wrote ${path.relative(REPO_ROOT, COLOR_CARD_MD)}`);
  console.log(`Updated ${path.relative(REPO_ROOT, USER_GUIDE_MD)}`);
}

main();
