// @ts-check
// Manifest merge, serialisation and atomic writer (design: "Manifest (manifest.mjs)").
// build/merge/serialise are pure; only writeManifest touches the filesystem.
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_VERSION = 1;
export const MANIFEST_FILE = 'manifest.json';

/** Non-empty text fields every entry must carry (Requirement 18.1). */
export const REQUIRED_TEXT_FIELDS = ['author', 'sourceUrl', 'license', 'changes'];

/** Output key order for an entry; fixed so equal inputs give equal bytes. */
const ENTRY_KEYS = [
  'pick',
  'title',
  'author',
  'sourceUrl',
  'license',
  'changes',
  'group',
  'bytes',
  'sha256',
  'inputsSha256',
  'recipe',
];

const isNonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

/** Ordinal (code unit) comparison, independent of locale. */
const ordinal = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Normalise a manifest key: forward slashes, no leading "./" or "/". */
export function manifestKey(relPath) {
  return String(relPath).replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
}

/** Return the list of problems with a candidate entry (empty list when valid). */
export function validateEntry(entry) {
  const problems = [];
  if (!entry || typeof entry !== 'object') return ['entry is not an object'];
  if (!isNonEmpty(entry.relPath)) problems.push('relPath is empty');
  for (const f of REQUIRED_TEXT_FIELDS) {
    if (!isNonEmpty(entry[f])) problems.push(`${f} is empty`);
  }
  return problems;
}

function cleanEntry(entry) {
  const out = {};
  for (const k of ENTRY_KEYS) {
    if (entry[k] !== undefined) out[k] = entry[k];
  }
  if (out.group === undefined) out.group = null;
  return out;
}

/** An empty manifest. */
export function emptyManifest() {
  return { version: MANIFEST_VERSION, files: {} };
}

/**
 * Replace entries by key, never removing other keys. Entries that fail validation
 * (empty source URL, author, license or changes) are refused: no key is written and
 * the previous entry for that key is left as is.
 * @param {{ version?: number, files?: Record<string, any> } | null | undefined} prev
 * @param {Array<any>} entries each carries `relPath` (path under the asset root)
 * @returns {{ version: 1, files: Record<string, any> }}
 */
export function mergeManifest(prev, entries) {
  return mergeManifestWithReport(prev, entries).manifest;
}

/** Same as mergeManifest but also returns refusals as `{ relPath, problems }`. */
export function mergeManifestWithReport(prev, entries) {
  const files = { ...(prev && prev.files ? prev.files : {}) };
  const refused = [];
  for (const entry of entries ?? []) {
    const problems = validateEntry(entry);
    if (problems.length > 0) {
      refused.push({ relPath: entry && entry.relPath ? String(entry.relPath) : '', problems });
      continue;
    }
    files[manifestKey(entry.relPath)] = cleanEntry(entry);
  }
  return { manifest: { version: MANIFEST_VERSION, files }, refused };
}

/**
 * Build a manifest from scratch from entries.
 * @param {Array<any>} entries
 */
export function buildManifest(entries) {
  return mergeManifest(emptyManifest(), entries);
}

/** Keys of `manifest` that are not in `onDiskRelPaths`, sorted; reported as warnings. */
export function findStaleKeys(manifest, onDiskRelPaths) {
  const present = new Set([...onDiskRelPaths].map(manifestKey));
  return Object.keys(manifest.files)
    .filter((k) => !present.has(k))
    .sort(ordinal);
}

/**
 * Stable JSON: keys sorted by path (ordinal), fixed entry key order, 2-space indent,
 * LF line endings, trailing newline, no timestamps or absolute paths.
 */
export function serializeManifest(manifest) {
  const files = {};
  for (const key of Object.keys(manifest.files).sort(ordinal)) {
    files[key] = cleanEntry(manifest.files[key]);
  }
  return JSON.stringify({ version: MANIFEST_VERSION, files }, null, 2) + '\n';
}

/** Parse manifest text; a missing or malformed file yields an empty manifest. */
export function parseManifest(text) {
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object' && data.files && typeof data.files === 'object') {
      return { version: MANIFEST_VERSION, files: data.files };
    }
  } catch {
    /* fall through */
  }
  return emptyManifest();
}

/**
 * Write the manifest via temp file plus rename, so a crash never leaves half a JSON file.
 * Skips the write when the target already holds identical bytes is left to the caller.
 * @param {string} assetRoot directory that holds (or will hold) manifest.json
 * @param {{ version: 1, files: Record<string, any> }} manifest
 * @returns {Promise<string>} the final path
 */
export async function writeManifest(assetRoot, manifest) {
  const target = path.join(assetRoot, MANIFEST_FILE);
  const tmp = `${target}.${process.pid}.tmp`;
  await mkdir(assetRoot, { recursive: true });
  try {
    await writeFile(tmp, serializeManifest(manifest), { encoding: 'utf8' });
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
  return target;
}
