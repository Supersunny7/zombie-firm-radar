import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildUserAgent, contactUrlFrom, downloadToFile, fetchJson } from './http.mjs';
import {
  downloadItems,
  downloadPolyHavenPick,
  fetchFiles,
  selectFiles,
} from './polyhaven.mjs';

const fixture = async (name) =>
  JSON.parse(await readFile(new URL(`./fixtures/polyhaven-files-${name}.json`, import.meta.url), 'utf8'));

const UA = 'ZombieFirmRadar-asset-fetch/1.0 (+https://example.test/repo)';
const noSleep = { userAgent: UA, sleep: async () => {} };
const md5 = (b) => createHash('md5').update(b).digest('hex');

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'asset-http-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('User-Agent', () => {
  it('normalises repository URLs', () => {
    expect(contactUrlFrom({ url: 'git+https://github.com/a/b.git' })).toBe('https://github.com/a/b');
    expect(() => contactUrlFrom(undefined)).toThrow();
  });
  it('reads tools/package.json and names the project', async () => {
    const ua = await buildUserAgent();
    expect(ua).toMatch(/^ZombieFirmRadar-asset-fetch\/1\.0 \(\+https:\/\/github\.com\/.+\)$/);
  });
});

describe('fetchJson', () => {
  it('sends the User-Agent and a timeout signal', async () => {
    let seen;
    const fetch = async (url, init) => {
      seen = init;
      return new Response('{"ok":true}');
    };
    expect(await fetchJson('https://api.polyhaven.com/files/x', { ...noSleep, fetch })).toEqual({ ok: true });
    expect(seen.headers['User-Agent']).toBe(UA);
    expect(seen.signal).toBeInstanceOf(AbortSignal);
  });

  it('retries twice with 1 s then 2 s back-off, then fails with the cause', async () => {
    let calls = 0;
    const waits = [];
    const fetch = async () => {
      calls += 1;
      return new Response('no', { status: 503 });
    };
    await expect(
      fetchJson('https://api.polyhaven.com/files/x', {
        userAgent: UA,
        fetch,
        sleep: async (ms) => waits.push(ms),
      }),
    ).rejects.toThrow('https://api.polyhaven.com/files/x: HTTP 503');
    expect(calls).toBe(3);
    expect(waits).toEqual([1000, 2000]);
  });

  it('succeeds on a retry', async () => {
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      if (calls < 3) throw new Error('ECONNRESET');
      return new Response('[1]');
    };
    expect(await fetchJson('https://api.polyhaven.com/a', { ...noSleep, fetch })).toEqual([1]);
    expect(calls).toBe(3);
  });

  it('rejects non-https URLs without a request', async () => {
    let calls = 0;
    const fetch = async () => ((calls += 1), new Response('{}'));
    await expect(fetchJson('http://api.polyhaven.com/a', { ...noSleep, fetch })).rejects.toThrow('https');
    expect(calls).toBe(0);
  });
});

describe('downloadToFile', () => {
  it('streams to .part then renames, returning hashes', async () => {
    const body = Buffer.from('hello world');
    const dest = path.join(dir, 'sub', 'f.bin');
    const r = await downloadToFile('https://dl.polyhaven.org/f', dest, {
      ...noSleep,
      fetch: async () => new Response(body),
    });
    expect(r).toMatchObject({ bytes: 11, md5: md5(body) });
    expect(await readFile(dest)).toEqual(body);
    expect(await readdir(path.join(dir, 'sub'))).toEqual(['f.bin']);
  });

  it('leaves no .part and no destination after final failure', async () => {
    const dest = path.join(dir, 'f.bin');
    await expect(
      downloadToFile('https://dl.polyhaven.org/f', dest, {
        ...noSleep,
        fetch: async () => new Response('x', { status: 500 }),
      }),
    ).rejects.toThrow('HTTP 500');
    expect(await readdir(dir)).toEqual([]);
  });
});

describe('selectFiles with recorded fixtures', () => {
  it('HDRI: hdri[res].hdr', async () => {
    const [f] = selectFiles(await fixture('hdri'), 'hdri', { id: 'moonlit_golf', resolution: '1k' });
    expect(f.relPath).toBe('moonlit_golf_1k.hdr');
    expect(f.url).toContain('dl.polyhaven.org');
    expect(f.size).toBeGreaterThan(0);
    expect(f.md5).toMatch(/^[0-9a-f]{32}$/);
  });

  it('texture: one file per requested map, default maps otherwise', async () => {
    const files = await fixture('texture');
    const some = selectFiles(files, 'texture', { id: 'slate_floor', resolution: '1k', maps: ['Diffuse', 'arm'] });
    expect(some.map((f) => f.relPath)).toEqual(['slate_floor_diff_1k.jpg', 'slate_floor_arm_1k.jpg']);
    const def = selectFiles(files, 'texture', { id: 'slate_floor', resolution: '1k' });
    expect(def).toHaveLength(3);
  });

  it('model: gltf plus include map with relative paths', async () => {
    const items = selectFiles(await fixture('model'), 'model', { id: 'tree_stump_01', resolution: '1k' });
    const rels = items.map((i) => i.relPath);
    expect(rels[0]).toBe('tree_stump_01_1k.gltf');
    expect(rels).toContain('tree_stump_01.bin');
    expect(rels).toContain('textures/tree_stump_01_diff_1k.jpg');
  });

  it('throws with available keys for a missing resolution', async () => {
    expect(() =>
      selectFiles({ hdri: { '1k': {} } }, 'hdri', { id: 'a', resolution: '32k' }),
    ).toThrow(/"32k" not offered \(available: 1k\)/);
  });

  it('refuses URLs outside dl.polyhaven.org and path escapes', () => {
    const bad = { hdri: { '1k': { hdr: { url: 'https://evil.test/a.hdr', size: 1, md5: 'x' } } } };
    expect(() => selectFiles(bad, 'hdri', { id: 'a', resolution: '1k' })).toThrow('Refusing');
  });
});

describe('fetchFiles and downloads', () => {
  it('calls only GET /files/{id}', async () => {
    const urls = [];
    const fetch = async (u) => (urls.push(u), new Response('{}'));
    await fetchFiles('Lantern_01', { ...noSleep, fetch });
    expect(urls).toEqual(['https://api.polyhaven.com/files/Lantern_01']);
    await expect(fetchFiles('../x', { ...noSleep, fetch })).rejects.toThrow('Invalid');
  });

  it('downloads an HDRI, checks size and md5, and records results', async () => {
    const body = Buffer.from('fake hdr bytes');
    const api = {
      hdri: { '1k': { hdr: { url: 'https://dl.polyhaven.org/x/a_1k.hdr', size: body.length, md5: md5(body) } } },
    };
    const fetch = async (u) =>
      u.startsWith('https://api.') ? new Response(JSON.stringify(api)) : new Response(body);
    const { records } = await downloadPolyHavenPick('hdri', { id: 'a', resolution: '1k' }, dir, { ...noSleep, fetch });
    expect(records[0]).toMatchObject({ file: 'a_1k.hdr', bytes: body.length, md5: md5(body) });
  });

  it('deletes the file and throws on md5 mismatch', async () => {
    const items = [{ relPath: 'a.bin', url: 'https://dl.polyhaven.org/a.bin', size: 3, md5: 'f'.repeat(32) }];
    await expect(
      downloadItems(items, dir, { ...noSleep, fetch: async () => new Response('abc') }),
    ).rejects.toThrow('md5');
    expect(await readdir(dir)).toEqual([]);
  });

  it('throws on size mismatch', async () => {
    const items = [{ relPath: 'a.bin', url: 'https://dl.polyhaven.org/a.bin', size: 9, md5: null }];
    await expect(
      downloadItems(items, dir, { ...noSleep, fetch: async () => new Response('abc') }),
    ).rejects.toThrow('size');
  });

  it('keeps include relative paths and rejects traversal', async () => {
    const ok = [{ relPath: 'textures/t.jpg', url: 'https://dl.polyhaven.org/t.jpg', size: null, md5: null }];
    await downloadItems(ok, dir, { ...noSleep, fetch: async () => new Response('x') });
    expect(await readdir(path.join(dir, 'textures'))).toEqual(['t.jpg']);
    const bad = [{ relPath: '../evil', url: 'https://dl.polyhaven.org/t.jpg', size: null, md5: null }];
    await expect(downloadItems(bad, dir, { ...noSleep, fetch: async () => new Response('x') })).rejects.toThrow();
  });
});
