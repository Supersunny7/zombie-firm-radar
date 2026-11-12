// Bundle budget check (app-shell Requirement 15). Runs after `vite build`.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIMIT_KB = 400;
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const GRAVEYARD_SRC = 'src/scenes/graveyard/GraveyardScene.tsx';
const LAB_SRC = 'src/scenes/lab/LabScene.tsx';
const FORBIDDEN = [
  { label: 'Ashgrove Works (dev fixture)', re: /Ashgrove Works/ },
  { label: '@theatre/studio', re: /@theatre\/studio/ },
  { label: 'ajv', re: /\bajv\b/i },
];

// Dev-only markers (graveyard-scene Requirement 1.8). Checked in every text file under dist/.
export const FORBIDDEN_MARKERS = [
  '__zfr_sample_generator__',
  'dev/sample/generate',
  'Larkspur',
  '__zfr_hand_closeup__',
];
const BINARY_EXT = /\.(glb|ktx2|hdr|png|jpe?g|webp|gif|mp3|ogg|wav|woff2?|ico)$/i;

function walk(dir, filter) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, filter);
    return filter(p) ? [p] : [];
  });
}

/**
 * Scans a build output folder for forbidden strings and returns failure messages.
 * Existing rules apply to JS under assets/; the dev-only markers apply to every
 * text file under the folder.
 */
export function checkForbidden(distDir) {
  const failures = [];
  const rel = (file) => file.slice(distDir.length + 1);
  const assetsDir = join(distDir, 'assets');
  if (existsSync(assetsDir)) {
    for (const file of walk(assetsDir, (p) => p.endsWith('.js'))) {
      const text = readFileSync(file, 'utf8');
      for (const { label, re } of FORBIDDEN) {
        if (re.test(text)) failures.push(`${label} found in ${rel(file)}`);
      }
    }
  }
  for (const file of walk(distDir, (p) => !BINARY_EXT.test(p))) {
    const text = readFileSync(file, 'utf8');
    for (const marker of FORBIDDEN_MARKERS) {
      if (text.includes(marker)) failures.push(`dev-only marker "${marker}" found in ${rel(file)}`);
    }
  }
  return failures;
}

function main() {
  const failures = [];
  const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'));

  const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
  if (!entryKey) {
    console.error('check-bundle: no entry found in manifest');
    process.exit(1);
  }

  /** Static-import closure only; dynamicImports are never followed. */
  const closure = (startKey) => {
    const seen = new Set();
    const visit = (key) => {
      if (seen.has(key) || !manifest[key]) return;
      seen.add(key);
      for (const dep of manifest[key].imports ?? []) visit(dep);
    };
    visit(startKey);
    return seen;
  };

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

  failures.push(...checkForbidden(DIST));

  if (failures.length > 0) {
    for (const f of failures) console.error(`check-bundle FAIL: ${f}`);
    process.exit(1);
  }
  console.log('check-bundle: OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
