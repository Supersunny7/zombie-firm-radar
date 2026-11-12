import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractZip } from './archive.mjs';
import { buildRecord, ensureDownloaded, isCached, readManual, resolveManualPicks } from './cache.mjs';
import { loadPicks } from './picks.mjs';
import { MANUAL_ROOT, REPO_ROOT } from './paths.mjs';

let tmp;
beforeEach(async () => { tmp = await mkdtemp(path.join(os.tmpdir(), 'cache-test-')); });
afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

const enc = (s) => new TextEncoder().encode(s);

describe('isCached / ensureDownloaded', () => {
  const pick = { id: 'rock', source: { type: 'url' } };
  const downloader = () => vi.fn(async (_p, dir) => {
    await writeFile(path.join(dir, 'a.bin'), 'hello');
    return buildRecord(dir, ['a.bin'], ['https://example.test/a.bin']);
  });

  it('downloads once, then makes zero downloader calls', async () => {
    const dl = downloader();
    const first = await ensureDownloaded(pick, dl, { downloadsRoot: tmp });
    expect(first.fromCache).toBe(false);
    const second = await ensureDownloaded(pick, dl, { downloadsRoot: tmp });
    expect(second.fromCache).toBe(true);
    expect(dl).toHaveBeenCalledTimes(1);
  });

  it('detects missing, resized and altered files', async () => {
    const dl = downloader();
    const { dir, record } = await ensureDownloaded(pick, dl, { downloadsRoot: tmp });
    expect(await isCached(dir, record)).toBe(true);
    await writeFile(path.join(dir, 'a.bin'), 'hellp'); // same size, different hash
    expect(await isCached(dir, record)).toBe(false);
    await writeFile(path.join(dir, 'a.bin'), 'hi');
    expect(await isCached(dir, record)).toBe(false);
    await rm(path.join(dir, 'a.bin'));
    expect(await isCached(dir, record)).toBe(false);
    expect(await ensureDownloaded(pick, dl, { downloadsRoot: tmp })).toMatchObject({ fromCache: false });
    expect(dl).toHaveBeenCalledTimes(2);
  });
});

describe('readManual', () => {
  const pick = { id: 'tomb', expectedFile: 'tomb.zip', source: { type: 'manual', pageUrl: 'https://sketchfab.example/tomb' } };

  it('finds a zip without network', async () => {
    await mkdir(path.join(tmp, 'tomb'));
    await writeFile(path.join(tmp, 'tomb', 'tomb.zip'), 'x');
    expect(await readManual(pick, { manualRoot: tmp })).toMatchObject({ ok: true, isZip: true });
  });

  it('reports expected file and page URL when missing, and the run fails', async () => {
    const r = await resolveManualPicks([pick], { manualRoot: tmp });
    expect(r.failed).toBe(true);
    expect(r.missing[0]).toMatchObject({ expectedFile: 'tomb.zip', pageUrl: 'https://sketchfab.example/tomb' });
    expect(r.missing[0].message).toContain('tomb.zip');
    expect(r.missing[0].message).toContain('https://sketchfab.example/tomb');
  });
});

describe('extractZip', () => {
  it('extracts nested entries', async () => {
    const zip = zipSync({ 'dir/a.txt': enc('A'), 'b.txt': enc('B') });
    const out = path.join(tmp, 'out');
    await extractZip(zip, out);
    expect(await readFile(path.join(out, 'dir', 'a.txt'), 'utf8')).toBe('A');
    expect(await readFile(path.join(out, 'b.txt'), 'utf8')).toBe('B');
  });

  it('blocks zip-slip and writes nothing', async () => {
    const zip = zipSync({ 'ok.txt': enc('ok'), '../evil.txt': enc('x') });
    const out = path.join(tmp, 'out');
    await expect(extractZip(zip, out)).rejects.toThrow(/escapes/);
    await expect(readFile(path.join(tmp, 'evil.txt'))).rejects.toThrow();
    await expect(readFile(path.join(out, 'ok.txt'))).rejects.toThrow();
  });

  it('extracts one named entry', async () => {
    const zip = zipSync({ 'a.txt': enc('A'), 'b.txt': enc('B') });
    const out = path.join(tmp, 'out');
    expect(await extractZip(zip, out, { only: 'b.txt' })).toHaveLength(1);
    await expect(extractZip(zip, out, { only: 'zzz' })).rejects.toThrow(/not found/);
  });
});

describe('real manual cache (read-only smoke)', () => {
  it('resolves every manual pick', async () => {
    const { ok, picks } = await loadPicks(path.join(REPO_ROOT, 'tools', 'picks.json'));
    expect(ok).toBe(true);
    const r = await resolveManualPicks(picks, { manualRoot: MANUAL_ROOT });
    console.log(`manual found=${r.found.length} missing=${r.missing.length}`, r.missing.map((m) => m.message));
    expect(r.missing).toEqual([]);
  });
});
