// Bundle budget check (app-shell Requirement 15). Runs after `vite build`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMIT_KB = 400;
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const GRAVEYARD_SRC = 'src/scenes/graveyard/GraveyardScene.tsx';
const LAB_SRC = 'src/scenes/lab/LabScene.tsx';
const FORBIDDEN = [
  { label: 'Ashgrove Works (dev fixture)', re: /Ashgrove Works/ },
  { label: '@theatre/studio', re: /@theatre\/studio/ },
  { label: 'ajv', re: /\bajv\b/i },
];

const failures = [];
const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'));

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('check-bundle: no entry found in manifest');
  process.exit(1);
}

/** Static-import closure only; dynamicImports are never followed. */
function closure(startKey) {
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key) || !manifest[key]) return;
    seen.add(key);
    for (const dep of manifest[key].imports ?? []) visit(dep);
  };
  visit(startKey);
  return seen;
}

const gzipBytes = (file) => gzipSync(readFileSync(join(DIST, file))).length;
const sizeOf = (keys) => [...keys].reduce((sum, k) => sum + gzipBytes(manifest[k].file), 0);
const kb = (bytes) => (bytes / 1024).toFixed(1);

const initial = closure(entryKey);
const initialBytes = sizeOf(initial);
console.log(`Initial JS: ${kb(initialBytes)} KB gzipped`);

const graveyardKey = Object.keys(manifest).find((k) => k === GRAVEYARD_SRC);
if (graveyardKey) {
  const withGraveyard = new Set([...initial, ...closure(graveyardKey)]);
  console.log(`Total JS after graveyard scene: ${kb(sizeOf(withGraveyard))} KB gzipped`);
} else {
  failures.push(`graveyard chunk (${GRAVEYARD_SRC}) not found in manifest`);
}

if (initialBytes / 1024 > LIMIT_KB) {
  failures.push(`Initial JS ${kb(initialBytes)} KB exceeds ${LIMIT_KB} KB gzipped`);
}

const labKey = Object.keys(manifest).find((k) => k === LAB_SRC);
if (!labKey) {
  failures.push(`lab chunk (${LAB_SRC}) not found in manifest`);
} else if (initial.has(labKey)) {
  failures.push('lab chunk is inside the initial JS closure');
} else {
  console.log('Lab chunk is outside the initial JS closure.');
}

function jsFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return jsFiles(p);
    return p.endsWith('.js') ? [p] : [];
  });
}
for (const file of jsFiles(join(DIST, 'assets'))) {
  const text = readFileSync(file, 'utf8');
  for (const { label, re } of FORBIDDEN) {
    if (re.test(text)) failures.push(`${label} found in ${file.slice(DIST.length + 1)}`);
  }
}

if (failures.length > 0) {
  for (const f of failures) console.error(`check-bundle FAIL: ${f}`);
  process.exit(1);
}
console.log('check-bundle: OK');
