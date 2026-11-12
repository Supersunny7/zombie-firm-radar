// Poly Haven client: GET /files/{id}, file selection, size and md5 checks.
// Only the documented endpoint is used (https://polyhaven.com/our-api).
// Response shape confirmed against live responses on 2026-11 (see design.md and fixtures/).
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { downloadToFile, fetchJson } from './http.mjs';
import { safeJoin } from './paths.mjs';

export const API_BASE = 'https://api.polyhaven.com';
export const DOWNLOAD_HOST = 'dl.polyhaven.org';
/** Texture maps used when a pick lists none. */
export const DEFAULT_TEXTURE_MAPS = ['Diffuse', 'nor_gl', 'Rough'];

const ID_PATTERN = /^[A-Za-z0-9_]+$/;

const isFileEntry = (v) => v && typeof v === 'object' && typeof v.url === 'string';

/** `GET /files/{id}`. */
export async function fetchFiles(id, opts = {}) {
  if (!ID_PATTERN.test(id)) throw new Error(`Invalid Poly Haven id: ${JSON.stringify(id)}`);
  return fetchJson(`${API_BASE}/files/${id}`, opts);
}

function entry(files, keys, label) {
  let node = files;
  for (const key of keys) {
    node = node?.[key];
    if (node === undefined || node === null) {
      const parent = keys.slice(0, keys.indexOf(key));
      let at = files;
      for (const k of parent) at = at?.[k];
      const available = at && typeof at === 'object' ? Object.keys(at).join(', ') : 'none';
      throw new Error(`${label}: "${key}" not offered (available: ${available})`);
    }
  }
  if (!isFileEntry(node)) throw new Error(`${label}: unexpected response shape`);
  return node;
}

function checkUrl(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.hostname !== DOWNLOAD_HOST) {
    throw new Error(`Refusing download URL outside ${DOWNLOAD_HOST}: ${url}`);
  }
}

function toItem(relPath, e) {
  checkUrl(e.url);
  return {
    relPath,
    url: e.url,
    size: typeof e.size === 'number' ? e.size : null,
    md5: typeof e.md5 === 'string' ? e.md5 : null,
  };
}

const baseName = (url) => decodeURIComponent(path.posix.basename(new URL(url).pathname));

/**
 * Choose the files to download. Pure.
 * @param files  parsed /files/{id} response
 * @param kind   'hdri' | 'texture' | 'model'
 * @param source { id, resolution, maps?, format? }
 * @returns [{ relPath, url, size, md5 }]
 */
export function selectFiles(files, kind, source) {
  const { id, resolution } = source;
  const label = `${id} (${resolution})`;
  if (kind === 'hdri') {
    const e = entry(files, ['hdri', resolution, source.format ?? 'hdr'], label);
    return [toItem(baseName(e.url), e)];
  }
  if (kind === 'texture') {
    const maps = source.maps?.length ? source.maps : DEFAULT_TEXTURE_MAPS;
    const format = source.format ?? 'jpg';
    return maps.map((map) => {
      const e = entry(files, [map, resolution, format], `${label} map ${map}`);
      return toItem(baseName(e.url), e);
    });
  }
  if (kind === 'model') {
    const g = entry(files, ['gltf', resolution, 'gltf'], label);
    const items = [toItem(baseName(g.url), g)];
    for (const [rel, inc] of Object.entries(g.include ?? {})) {
      if (!isFileEntry(inc)) throw new Error(`${label}: bad include entry ${rel}`);
      items.push(toItem(rel, inc));
    }
    return items;
  }
  throw new Error(`Poly Haven does not provide kind "${kind}"`);
}

/** Verify downloaded size and md5 against the API values (when present). */
export function verifyDownload(item, result) {
  if (item.size !== null && result.bytes !== item.size) {
    throw new Error(`${item.relPath}: size ${result.bytes} does not match API size ${item.size}`);
  }
  if (item.md5 !== null && result.md5 !== item.md5) {
    throw new Error(`${item.relPath}: md5 ${result.md5} does not match API md5 ${item.md5}`);
  }
}

/**
 * Download every item sequentially into destDir (relPaths keep their folders),
 * verifying size and md5. A file that fails verification is deleted.
 * Returns [{ file, bytes, sha256, md5, url }].
 */
export async function downloadItems(items, destDir, opts = {}) {
  const records = [];
  for (const item of items) {
    const dest = safeJoin(destDir, ...item.relPath.split('/'));
    const result = await downloadToFile(item.url, dest, opts);
    try {
      verifyDownload(item, result);
    } catch (err) {
      await rm(dest, { force: true });
      throw err;
    }
    records.push({
      file: item.relPath,
      url: item.url,
      bytes: result.bytes,
      sha256: result.sha256,
      md5: result.md5,
    });
  }
  return records;
}

/** Fetch /files/{id}, select, download. Returns { records, apiResponse }. */
export async function downloadPolyHavenPick(kind, source, destDir, opts = {}) {
  const apiResponse = await fetchFiles(source.id, opts);
  const items = selectFiles(apiResponse, kind, source);
  const records = await downloadItems(items, destDir, opts);
  return { records, apiResponse };
}
