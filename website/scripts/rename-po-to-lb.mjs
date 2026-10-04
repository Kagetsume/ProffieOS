/**
 * One-off migration: lb-* custom elements → lb-* (LayerBlade).
 * Run from repo: node website/scripts/rename-lb-to-lb.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function mapSegment(seg) {
  return seg.startsWith('lb-') ? `lb-${seg.slice(3)}` : seg;
}

function mapPath(relPath) {
  return relPath.split(/[/\\]/).map(mapSegment).join(path.sep);
}

function walkFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    if (ent.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walkFiles(websiteRoot);
const toRename = allFiles
  .map((abs) => ({ abs, rel: path.relative(websiteRoot, abs) }))
  .filter(({ rel }) => rel.split(/[/\\]/).some((s) => s.startsWith('lb-')))
  .sort((a, b) => b.rel.length - a.rel.length);

for (const { abs, rel } of toRename) {
  const newRel = mapPath(rel);
  const newAbs = path.join(websiteRoot, newRel);
  fs.mkdirSync(path.dirname(newAbs), { recursive: true });
  fs.renameSync(abs, newAbs);
}

const textExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.html', '.css']);
const textFiles = walkFiles(websiteRoot).filter((f) => textExt.has(path.extname(f)));

function transformContent(text) {
  let s = text;
  s = s.replace(/\bPoElement\b/g, 'LbElement');
  s = s.replace(/\bPo([A-Z][a-zA-Z0-9]*)\b/g, 'Lb$1');
  s = s.replace(/\bpo([A-Z][a-zA-Z0-9]*)/g, 'lb$1');
  s = s.replace(/lb-/g, 'lb-');
  return s;
}

for (const abs of textFiles) {
  const raw = fs.readFileSync(abs, 'utf8');
  const next = transformContent(raw);
  if (next !== raw) fs.writeFileSync(abs, next, 'utf8');
}

console.log(`Renamed ${toRename.length} paths; updated ${textFiles.length} text files scanned.`);
