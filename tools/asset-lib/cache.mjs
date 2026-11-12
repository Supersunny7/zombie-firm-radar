// Download cache records, skip logic and the manual-cache reader (design: "Cache layout").
// The downloader is injected, so nothing here talks to the network.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CACHE_ROOT, safeJoin } from './paths.mjs';

export const RECORD_FILE = '.download.json';
export const DOWNLOADS_ROOT = path.join(CACHE_ROOT, 'downloads');
export const MANUAL_ROOT = path.join(CACHE_ROOT, 'manual');

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(file).on('data', (c) => h.update(c)).on('error', reject).on('end', () => resolve(h.digest('hex')));
  });
}

/**
 * DownloadRecord: { sourceUrls: string[], files: [{ file, bytes, sha256, md5? }], apiResponse? }.
 * Cached when every listed file exists in cacheDir with equal size and SHA-256.
 */
export async function isCached(cacheDir, record) {
  if (!record || !Array.isArray(record.files) || record.files.length === 0) return false;
  try {
    for (const f of record.files) {
      const full = safeJoin(cacheDir, f.file);
      const st = await stat(full);
      if (!st.isFile() || st.size !== f.bytes) return false;
      if ((await sha256File(full)) !== String(f.sha256).toLowerCase()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Read <cacheDir>/.download.json; null when missing or unparsable. */
export async function readRecord(cacheDir) {
  try {
    return JSON.parse(await readFile(path.join(cacheDir, RECORD_FILE), 'utf8'));
  } catch {
    return null;
  }
}

/** Build a record for files already in cacheDir (sizes and hashes computed here). */
export async function buildRecord(cacheDir, fileNames, sourceUrls, extra = {}) {
  const files = [];
  for (const file of fileNames) {
    const full = safeJoin(cacheDir, file);
    files.push({ file, bytes: (await stat(full)).size, sha256: await sha256File(full), ...(extra.md5?.[file] ? { md5: extra.md5[file] } : {}) });
  }
  const record = { sourceUrls, files };
  if (extra.apiResponse !== undefined) record.apiResponse = extra.apiResponse;
  return record;
}

export async function writeRecord(cacheDir, record) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, RECORD_FILE), `${JSON.stringify(record, null, 2)}\n`);
}

/**
 * Make sure a downloaded pick is in downloads/<id>/.
 * `download(pick, dir)` is injected; it must fill dir and resolve to a DownloadRecord
 * ({ sourceUrls, files, apiResponse? }). It is NOT called when the pick is cached (0 requests).
 * Returns { dir, record, fromCache }.
 */
export async function ensureDownloaded(pick, download, { downloadsRoot = DOWNLOADS_ROOT } = {}) {
  const dir = safeJoin(downloadsRoot, pick.id);
  const existing = await readRecord(dir);
  if (existing && (await isCached(dir, existing))) return { dir, record: existing, fromCache: true };
  await mkdir(dir, { recursive: true });
  const record = await download(pick, dir);
  await writeRecord(dir, record);
  return { dir, record, fromCache: false };
}

/**
 * Manual-cache reader: resolve manual/<id>/<expectedFile> without any network request.
 * Found: { ok: true, file, isZip, entry? }. Missing: { ok: false, expectedFile, pageUrl, message },
 * and the caller skips the pick and marks the run failed (Requirement 14.9).
 */
export async function readManual(pick, { manualRoot = MANUAL_ROOT } = {}) {
  const expectedFile = pick.expectedFile;
  const pageUrl = pick.source?.pageUrl ?? null;
  const miss = () => ({
    ok: false,
    expectedFile,
    pageUrl,
    message: `${pick.id}: missing manual file "${expectedFile}" in ${path.join(manualRoot, pick.id)}; download it from ${pageUrl}`,
  });
  if (typeof expectedFile !== 'string' || expectedFile === '') return miss();
  let file;
  try {
    file = safeJoin(manualRoot, pick.id, expectedFile);
    if (!(await stat(file)).isFile()) return miss();
  } catch {
    return miss();
  }
  const result = { ok: true, file, isZip: path.extname(file).toLowerCase() === '.zip' };
  if (pick.source?.entry) result.entry = pick.source.entry;
  return result;
}

/** Resolve all manual picks; returns { found, missing, failed } (failed = missing.length > 0). */
export async function resolveManualPicks(picks, opts) {
  const found = [];
  const missing = [];
  for (const p of picks) {
    if (p.source?.type !== 'manual') continue;
    const r = await readManual(p, opts);
    if (r.ok) found.push({ id: p.id, ...r });
    else missing.push({ id: p.id, ...r });
  }
  return { found, missing, failed: missing.length > 0 };
}
