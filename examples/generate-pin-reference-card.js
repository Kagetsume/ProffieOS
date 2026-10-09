#!/usr/bin/env node
/**
 * Proffieboard V3 (incl. 3.9) named-pin reference for docs + pin card PDF.
 * Sources: config/proffieboard_v3_config.h, common/blade_config_pin_names.h
 *
 * Run from repo root: node examples/generate-pin-reference-card.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const V3_CONFIG = path.join(REPO_ROOT, 'config', 'proffieboard_v3_config.h');
const PIN_NAMES_H = path.join(REPO_ROOT, 'common', 'blade_config_pin_names.h');
const PIN_CARD_MD = path.join(__dirname, 'config-layers-pin-card.md');
const PIN_REFERENCE_MD = path.join(REPO_ROOT, 'doc', 'pin_reference.md');

const SD_NAME_RE = /if\s*\(!strcmp\(str,\s*"([^"]+)"\)\)/g;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseSdBladeIniNames() {
  const source = fs.readFileSync(PIN_NAMES_H, 'utf8');
  const names = new Set();
  let m;
  while ((m = SD_NAME_RE.exec(source)) !== null) {
    names.add(m[1]);
  }
  if (names.size === 0) {
    throw new Error('No SD pin names found in blade_config_pin_names.h');
  }
  return names;
}

function parseV3SaberPins() {
  const source = fs.readFileSync(V3_CONFIG, 'utf8');
  const start = source.indexOf('enum SaberPins');
  if (start < 0) throw new Error('enum SaberPins not found');
  const end = source.indexOf('};', start);
  if (end < 0) throw new Error('enum SaberPins not closed');
  const block = source.slice(start, end);

  let category = 'Other';
  const pins = [];
  for (const line of block.split('\n')) {
    const cat = line.match(/^\s*\/\/\s*(.+)\s*$/);
    if (cat && !line.includes('=')) {
      category = cat[1].trim();
      continue;
    }
    const entry = line.match(/^\s*(\w+)\s*=\s*(-?\d+)\s*,?\s*(?:\/\/\s*(.*))?/);
    if (!entry) continue;
    pins.push({
      name: entry[1],
      gpio: Number(entry[2]),
      category,
      note: (entry[3] || '').trim(),
    });
  }
  if (pins.length === 0) throw new Error('No pins parsed from proffieboard_v3_config.h');
  return pins;
}

function groupByCategory(pins) {
  const order = [];
  const map = new Map();
  for (const p of pins) {
    if (!map.has(p.category)) {
      map.set(p.category, []);
      order.push(p.category);
    }
    map.get(p.category).push(p);
  }
  return { order, map };
}

function mdTableRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function buildMarkdownReference(pins, sdNames, generatedAt) {
  const { order, map } = groupByCategory(pins);
  const sdPins = pins.filter((p) => sdNames.has(p.name));

  const lines = [];
  lines.push('# Proffieboard V3 pin names (ProffieOS reference)');
  lines.push('');
  lines.push(
    '**Proffieboard V3** hardware (including **V3.9**) uses the C symbols in `config/proffieboard_v3_config.h`. ' +
      'When you use SD **`config/blades.ini`**, only the **blade / power / identify** names listed in ' +
      '`common/blade_config_pin_names.h` are accepted as text tokens (not button, I2C, or audio pins).',
  );
  lines.push('');
  lines.push(
    `Generated **${generatedAt}** from those headers. Re-run \`node examples/generate-pin-reference-card.js\` after pin-map changes. ` +
      'Compact PDF: [`examples/config-layers-pin-card.md`](../examples/config-layers-pin-card.md).',
  );
  lines.push('');
  lines.push('## Quick wiring ↔ SD names');
  lines.push('');
  lines.push('| Board role | Typical use | `blades.ini` token |');
  lines.push('|------------|-------------|---------------------|');
  lines.push('| Blade 1 (main) data | NeoPixel / WS2811 | `bladePin` |');
  lines.push('| Blade 1 identify / FoC | Blade ID input | `bladeIdentifyPin` (not a strip data line) |');
  lines.push('| Blade 2–4 data | Extra NeoPixel ports | `blade2Pin`, `blade3Pin`, `blade4Pin` |');
  lines.push('| Free1–Free3 | Accent PWM or extra data | `blade5Pin`, `blade6Pin`, `blade7Pin` |');
  lines.push('| UART / extra data | PC0 / PC1 | `blade8Pin`, `blade9Pin` |');
  lines.push('| Blade power FET 1–6 | Main strip power | `bladePowerPin1` … `bladePowerPin6` |');
  lines.push('| Free1–3 as FET/PWM | Same GPIO as Free lines | `bladePowerPin7` … `bladePowerPin9` |');
  lines.push('| Data2 / Data3 as power | Shared with `blade2Pin` / `blade3Pin` | `bladePowerPin10`, `bladePowerPin11` |');
  lines.push('');
  lines.push(
    '**Important:** Values like `power_pin1 = 1` are **MCU GPIO 1**, not “FET slot 1”. Always use **`bladePowerPin1`** etc. See [`blade_config.md`](blade_config.md).',
  );
  lines.push('');
  lines.push('## Names valid in `config/blades.ini`');
  lines.push('');
  lines.push('| C name | GPIO | Notes |');
  lines.push('|--------|------|-------|');
  for (const p of sdPins.sort((a, b) => a.name.localeCompare(b.name))) {
    const note = p.note || '—';
    lines.push(mdTableRow([`\`${p.name}\``, String(p.gpio), note.replace(/\|/g, '\\|')]));
  }
  lines.push('');
  lines.push('## Full `SaberPins` map (Proffieboard V3 firmware)');
  lines.push('');
  lines.push(
    'These names exist in the board **`CONFIG_FILE`** for wiring, buttons, motion, and audio. ' +
      'Only the table above is parsed from SD **`blades.ini`** text fields.',
  );
  lines.push('');

  for (const cat of order) {
    lines.push(`### ${cat}`);
    lines.push('');
    lines.push('| C name | GPIO | Notes |');
    lines.push('|--------|------|-------|');
    for (const p of map.get(cat)) {
      const sd = sdNames.has(p.name) ? ' · **SD blades.ini**' : '';
      const note = (p.note || '—') + sd;
      lines.push(mdTableRow([`\`${p.name}\``, String(p.gpio), note.replace(/\|/g, '\\|')]));
    }
    lines.push('');
  }

  lines.push('## Bonded pins (do not use two roles at once)');
  lines.push('');
  lines.push(
    'V3 firmware marks these GPIO pairs as bonded in `proffieboard_v3_config.h` (`PROFFIEOS_BOND_PINS`): ' +
      '**(0,1), (2,3), (4,5), (9,10), (11,12), (13,14)** — same physical lines as blade data + identify, data2/3, Free3, buttons, etc. Plan **`blades.ini`** so you do not enable conflicting drivers on bonded pairs.',
  );
  lines.push('');
  lines.push('## Other Proffieboard revisions');
  lines.push('');
  lines.push(
    '**V1** and **V2** boards use different GPIO numbers for the **same symbol names** (`bladePin`, `bladePowerPin1`, …). ' +
      'Always match your Arduino **Tools → Board** selection and `CONFIG_FILE`; do not copy numeric GPIO from this V3 table onto V1/V2.',
  );
  lines.push('');
  lines.push('## See also');
  lines.push('');
  lines.push('- [`blade_config.md`](blade_config.md) — SD blade file format');
  lines.push('- [`board_config.md`](board_config.md) — SD board/features INI');
  lines.push('- Hardware pinout: [`doc/V3-pinout.svg`](V3-pinout.svg)');
  lines.push('');

  return lines.join('\n');
}

function buildPinCardHtml(pins, sdNames, generatedAt) {
  const { order, map } = groupByCategory(pins);
  const sdList = pins.filter((p) => sdNames.has(p.name)).sort((a, b) => a.name.localeCompare(b.name));

  function tableSection(title, lead, rows, highlightSd) {
    const head = `<section class="pin-card-section">
  <h2 class="pin-card-section-title">${title}</h2>
  <p class="pin-card-section-lead">${lead}</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>`;
    const body = rows
      .map((p) => {
        const cls = highlightSd && sdNames.has(p.name) ? 'pin-row-sd' : '';
        const role = escapeHtml(p.note || p.category);
        return `<tr class="${cls}"><td><code>${escapeHtml(p.name)}</code></td><td>${p.gpio}</td><td>${role}</td></tr>`;
      })
      .join('\n');
    return `${head}\n${body}\n    </tbody>\n  </table>\n</section>`;
  }

  let sections = tableSection(
    'Section A — SD <code>blades.ini</code> tokens',
    'Use these spellings in <code>data_pin=</code>, <code>power_pin*=</code>, and simple-blade <code>pin*=</code> · <code>blade_config_pin_names.h</code>',
    sdList,
    true,
  );

  for (const cat of order) {
    sections += '\n' + tableSection(`Section B — ${escapeHtml(cat)}`, 'Firmware <code>SaberPins</code> · Proffieboard V3', map.get(cat), false);
  }

  return `<div class="title-page pin-card-title">
  <h1>Pin reference</h1>
  <p class="subtitle">Proffieboard V3 (incl. 3.9) · ProffieOS</p>
  <hr class="rule" />
  <p class="purpose">Section <strong>A</strong>: names accepted in SD <strong>config/blades.ini</strong>. Section <strong>B</strong>: full board pin map from <strong>proffieboard_v3_config.h</strong> (buttons, I2C, audio, etc.). GPIO values are MCU indices for V3 only.</p>
  <p class="meta">Generated ${generatedAt} · SD tokens: ${sdList.length} · SaberPins: ${pins.length}</p>
</div>

${sections}

<section class="pin-card-section pin-card-foot">
  <h2 class="pin-card-section-title">Bonded GPIO pairs (V3)</h2>
  <p class="pin-card-section-lead">Do not assign conflicting roles on the same bonded pair: (0,1) (2,3) (4,5) (9,10) (11,12) (13,14)</p>
</section>
`;
}

function main() {
  const sdNames = parseSdBladeIniNames();
  const pins = parseV3SaberPins();
  const generatedAt = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(PIN_REFERENCE_MD, buildMarkdownReference(pins, sdNames, generatedAt), 'utf8');
  fs.writeFileSync(PIN_CARD_MD, buildPinCardHtml(pins, sdNames, generatedAt), 'utf8');

  console.log(`Wrote ${path.relative(REPO_ROOT, PIN_REFERENCE_MD)} (${pins.length} pins, ${sdNames.size} SD names)`);
  console.log(`Wrote ${path.relative(REPO_ROOT, PIN_CARD_MD)}`);
  console.log('PDF: npx md-to-pdf examples/config-layers-pin-card.md --config-file examples/config-layers-pin-card.config.js');
}

main();
