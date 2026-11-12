// Prune assets of picks that were removed from picks.json (Requirement 45).
// planPrune and the two text editors are pure. applyPrune touches only files listed in the Manifest
// under a removed id's `<typeDir>/<id>/` folder, through an injectable fs.
import * as nodeFs from 'node:fs/promises';
import path from 'node:path';
import { parseCredits } from './credits.mjs';
import { manifestKey } from './manifest.mjs';
import { KIND_FOLDERS, safeJoin } from './paths.mjs';

const TYPE_DIRS = new Set(Object.values(KIND_FOLDERS));
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const ordinal = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Classify a path (relative to the asset root, `/` separated).
 * Returns null when the path has no owner (shared files such as manifest.json),
 * { error } when it is malformed or escapes, or { typeDir, id }.
 */
function owner(rel) {
  const parts = rel.split('/');
  if (parts.length < 3) return null; // manifest.json, <typeDir>/<file>: no owner
  if (parts.some((p) => p === '..' || p === '' || p.includes('\0')) || /^[a-zA-Z]:/.test(parts[0])) {
    return { error: `path escapes or is malformed: ${rel}` };
  }
  const [typeDir, id] = parts;
  if (!TYPE_DIRS.has(typeDir)) return { error: `not under a known type folder: ${rel}` };
  if (!ID_RE.test(id)) return { error: `invalid pick id folder: ${rel}` };
  return { typeDir, id };
}

/** Rows of a CREDITS.md text as [{ path, line }] (line index in parseCredits().lines). */
function creditPaths(credits) {
  if (Array.isArray(credits)) return credits.map((p) => String(p));
  if (typeof credits !== 'string' || credits === '') return [];
  const parsed = parseCredits(credits);
  return parsed ? parsed.rows.map((cells) => cells[0]) : [];
}

/**
 * @param {{ picks: {id:string}[], manifest: {files:Record<string,any>}, credits?: string|string[],
 *   assetRoot: string, assetPrefix?: string }} args
 *   credits: CREDITS.md text, or a list of row Paths. Row Paths start with `assetPrefix`
 *   (default `web/public/assets`); rows outside it have no owner here.
 * @returns {{ folders: {id:string, typeDir:string, rel:string, dir:string, files:string[]}[],
 *   manifestKeys: string[], creditRows: string[], errors: {path:string, message:string}[] }}
 */
export function planPrune({ picks, manifest, credits = '', assetRoot, assetPrefix = 'web/public/assets' }) {
  const kept = new Set((picks ?? []).map((p) => p.id));
  const errors = [];
  const groups = new Map(); // `${typeDir}/${id}` -> { id, typeDir, files:Set }
  const manifestKeys = [];
  const creditRows = [];
  const prefix = `${assetPrefix.replace(/\/+$/, '')}/`;

  const note = (rel, source) => {
    const o = owner(rel);
    if (o === null) return null;
    if (o.error) {
      errors.push({ path: rel, message: o.error });
      return null;
    }
    if (kept.has(o.id)) return null;
    const key = `${o.typeDir}/${o.id}`;
    if (!groups.has(key)) groups.set(key, { id: o.id, typeDir: o.typeDir, files: new Set() });
    return groups.get(key);
  };

  for (const rawKey of Object.keys(manifest?.files ?? {})) {
    const key = manifestKey(rawKey);
    const g = note(key, 'manifest');
    if (g) {
      g.files.add(key);
      manifestKeys.push(rawKey);
    }
  }
  for (const rowPath of creditPaths(credits)) {
    const p = String(rowPath).replace(/\\/g, '/');
    if (!p.startsWith(prefix)) continue;
    const g = note(p.slice(prefix.length), 'credits');
    if (g) creditRows.push(rowPath);
  }

  const folders = [];
  for (const g of [...groups.values()].sort((a, b) => ordinal(`${a.typeDir}/${a.id}`, `${b.typeDir}/${b.id}`))) {
    const rel = `${g.typeDir}/${g.id}`;
    let dir;
    try {
      dir = safeJoin(assetRoot, g.typeDir, g.id);
    } catch (err) {
      errors.push({ path: rel, message: err.message });
      continue;
    }
    folders.push({ id: g.id, typeDir: g.typeDir, rel, dir, files: [...g.files].sort(ordinal) });
  }
  const skipped = new Set(errors.map((e) => e.path));
  return {
    folders,
    manifestKeys: manifestKeys.filter((k) => !skipped.has(k)).sort(ordinal),
    creditRows: [...new Set(creditRows)].sort(ordinal),
    errors,
  };
}

/** True when the plan has nothing to do. */
export const isEmptyPlan = (plan) =>
  plan.folders.length === 0 && plan.manifestKeys.length === 0 && plan.creditRows.length === 0;

/** Manifest without the pruned keys (pure). */
export function pruneManifest(manifest, keys) {
  const drop = new Set(keys.map(manifestKey));
  const files = {};
  for (const [k, v] of Object.entries(manifest?.files ?? {})) if (!drop.has(manifestKey(k))) files[k] = v;
  return { ...manifest, files };
}

/** CREDITS.md text without the table rows whose Path is listed; every other byte stays (pure). */
export function pruneCreditsText(markdown, rowPaths) {
  const parsed = parseCredits(markdown);
  if (!parsed || rowPaths.length === 0) return markdown;
  const drop = new Set(rowPaths.map((p) => p.trim()));
  const out = parsed.lines.filter((_, i) => i < parsed.bodyStart || i >= parsed.end || !drop.has(parsed.rows[i - parsed.bodyStart][0]));
  return out.join('');
}

/**
 * Execute the file part of a plan. Deletes only the files listed for each folder, refuses symlinks and
 * folders whose real path leaves the asset root, then removes the folder only when it is empty.
 * `guard(absPath)` (optional) may throw to refuse a write.
 * @returns {Promise<{ deleted:string[], removedDirs:string[], errors:{path:string,message:string}[], warnings:string[] }>}
 */
export async function applyPrune(plan, { assetRoot, fs = nodeFs, guard = () => {} } = {}) {
  const res = { deleted: [], removedDirs: [], errors: [], warnings: [] };
  let realRoot;
  try {
    realRoot = await fs.realpath(assetRoot);
  } catch {
    return res; // no asset root, nothing to delete
  }
  for (const folder of plan.folders) {
    try {
      const st = await fs.lstat(folder.dir).catch((e) => (e.code === 'ENOENT' ? null : Promise.reject(e)));
      if (!st) continue;
      const real = await fs.realpath(folder.dir);
      const rel = path.relative(realRoot, real);
      if (st.isSymbolicLink() || !st.isDirectory() || rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).length !== 2) {
        res.errors.push({ path: folder.rel, message: `refusing to prune ${folder.rel}: not a direct folder inside the asset root` });
        continue;
      }
      for (const key of folder.files) {
        const file = safeJoin(folder.dir, ...key.slice(folder.rel.length + 1).split('/'));
        guard(file);
        const fst = await fs.lstat(file).catch((e) => (e.code === 'ENOENT' ? null : Promise.reject(e)));
        if (!fst) continue;
        if (fst.isSymbolicLink() || !fst.isFile()) {
          res.errors.push({ path: key, message: `refusing to delete ${key}: not a regular file` });
          continue;
        }
        await fs.rm(file);
        res.deleted.push(key);
      }
      guard(folder.dir);
      try {
        await fs.rmdir(folder.dir);
        res.removedDirs.push(folder.rel);
      } catch (err) {
        if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST') {
          res.warnings.push(`kept ${folder.rel}: it holds files that are not in the manifest`);
        } else if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    } catch (err) {
      res.errors.push({ path: folder.rel, message: err.message });
    }
  }
  return res;
}
