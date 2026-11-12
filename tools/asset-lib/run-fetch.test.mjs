import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRocketboxUrl, makeDownloader as makeRealDownloader } from './downloader.mjs';
import { exitCodeFor, formatRunReport } from './report.mjs';
import { assertWritable, mapName, runFetch } from './run-fetch.mjs';
import { makeEnv, makePick } from './test-helpers/fakes.mjs';

const exists = (p) => stat(p).then(() => true, () => false);

function manualAudio(id, extra = {}) {
  return makePick(id, 'audio', {
    group: 'lab',
    source: { type: 'manual', pageUrl: 'https://freesound.org/s/1/', downloadOption: 'Download original' },
    manual: true,
    expectedFile: `${id}.wav`,
    targetFolder: `tools/cache/manual/${id}`,
    ...extra,
  });
}

async function placeManual(roots, pick, text = 'wav-bytes') {
  const dir = path.join(roots.cacheRoot, 'manual', pick.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, pick.expectedFile), text);
}

const hdriPick = (id) =>
  makePick(id, 'hdri', { role: 'environment', source: { type: 'polyhaven', id: 'x_y', resolution: '1k' } });

describe('runFetch', () => {
  it('converts every kind, writes manifest, credits and manual README, then skips on re-run', async () => {
    const { env, roots, downloadCalls, convertCalls } = await makeEnv();
    const audio = manualAudio('snd-one');
    await placeManual(roots, audio);
    const picks = [makePick('tex-one', 'texture'), hdriPick('sky-one'), makePick('gate-one', 'model'), audio];

    const first = await runFetch({ picks, env });
    expect(first.failed).toEqual([]);
    expect(first.exitCode).toBe(0);
    expect(first.written.sort()).toEqual([
      'audio/snd-one/snd-one.mp3',
      'audio/snd-one/snd-one.ogg',
      'hdri/sky-one/sky-one_1k.hdr',
      'models/gate-one/gate-one.glb',
      'textures/tex-one/tex-one_color.webp',
    ]);
    const manifest = JSON.parse(await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8'));
    expect(Object.keys(manifest.files)).toHaveLength(5);
    expect(manifest.files['audio/snd-one/snd-one.ogg'].group).toBe('lab');
    const credits = await readFile(roots.creditsFile, 'utf8');
    expect(credits).toContain('web/public/assets/models/gate-one/gate-one.glb');
    expect(credits).toContain('Powered by Poly Haven');
    expect(await exists(path.join(roots.cacheRoot, 'manual', 'README.md'))).toBe(true);
    expect(await readdir(path.join(roots.cacheRoot, 'work')).catch(() => [])).toEqual([]);
    expect(first.budgets.used.total).toBeGreaterThan(0);

    const creditsAfter1 = credits;
    const manifestText = await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8');
    const dl = downloadCalls.length;
    const cv = convertCalls.length;
    const second = await runFetch({ picks, env });
    expect(second.written).toEqual([]);
    expect(second.skipped.sort()).toEqual(['gate-one', 'sky-one', 'snd-one', 'tex-one']);
    expect(downloadCalls.length).toBe(dl);
    expect(convertCalls.length).toBe(cv);
    expect(await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8')).toBe(manifestText);
    expect(await readFile(roots.creditsFile, 'utf8')).toBe(creditsAfter1);
  });

  it('refuses non-allowed licenses, writes nothing for them and continues', async () => {
    const { env, roots } = await makeEnv();
    const bad = makePick('bad-nc', 'texture', { credits: { license: 'CC BY-NC 4.0' } });
    const good = makePick('good-tex', 'texture');
    const r = await runFetch({ picks: [bad, good], env });
    expect(r.refused).toEqual([{ name: 'bad-nc', reason: 'forbidden' }]);
    expect(r.written).toEqual(['textures/good-tex/good-tex_color.webp']);
    expect(await exists(path.join(roots.assetRoot, 'textures', 'bad-nc'))).toBe(false);
    expect(r.exitCode).toBe(1);
  });

  it('continues after a failed pick, leaves no partial output and exits 1', async () => {
    const { env, roots } = await makeEnv({ converters: { failIds: ['broken'] }, downloader: { failIds: ['net-down'] } });
    const picks = [makePick('broken', 'texture'), makePick('net-down', 'texture'), makePick('fine', 'texture')];
    const r = await runFetch({ picks, env });
    expect(r.failed.map((f) => f.name).sort()).toEqual(['broken', 'net-down']);
    expect(r.written).toEqual(['textures/fine/fine_color.webp']);
    expect(await exists(path.join(roots.assetRoot, 'textures', 'broken'))).toBe(false);
    expect(r.exitCode).toBe(1);
    expect(formatRunReport(r)).toContain('failed: broken: converter boom');
  });

  it('reports a missing manual file and fails the run', async () => {
    const { env } = await makeEnv();
    const r = await runFetch({ picks: [manualAudio('snd-missing')], env });
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0].message).toContain('snd-missing.wav');
    expect(r.exitCode).toBe(1);
  });

  it('dry run writes nothing', async () => {
    const { env, roots, downloadCalls } = await makeEnv();
    const r = await runFetch({ picks: [makePick('tex-dry', 'texture')], env, dryRun: true });
    expect(r.plan).toEqual([{ id: 'tex-dry', action: 'download and convert' }]);
    expect(downloadCalls).toEqual([]);
    expect(await exists(roots.assetRoot)).toBe(false);
    expect(await exists(roots.cacheRoot)).toBe(false);
    expect(r.exitCode).toBe(0);
  });

  it('--only limits the run and reports unknown ids', async () => {
    const { env } = await makeEnv();
    const picks = [makePick('a-one', 'texture'), makePick('b-two', 'texture')];
    const r = await runFetch({ picks, env, only: ['b-two', 'nope'] });
    expect(r.written).toEqual(['textures/b-two/b-two_color.webp']);
    expect(r.failed).toEqual([{ name: 'nope', cause: 'unknown pick id (--only)' }]);
  });

  it('fails a generated pick cleanly while the generator hook is not wired', async () => {
    const { env } = await makeEnv();
    const gen = makePick('own-decal', 'texture', { source: { type: 'generated', generator: 'decals', decal: 'handprint', variants: 3 } });
    const r = await runFetch({ picks: [gen], env });
    expect(r.failed[0].cause).toContain('not wired');
  });

  it('gives LICENSE files their own "changes" text and carries sizeException into the manifest', async () => {
    const { env, roots } = await makeEnv({
      env: {
        generators: {
          generated: async (pick, { outDir }) => {
            await writeFile(path.join(outDir, `${pick.id}_a.webp`), 'gen');
            await writeFile(path.join(outDir, 'LICENSE'), 'MIT text');
            return {
              files: [
                { fileName: `${pick.id}_a.webp`, path: path.join(outDir, `${pick.id}_a.webp`), bytes: 3 },
                { fileName: 'LICENSE', path: path.join(outDir, 'LICENSE'), bytes: 8, title: 'Microsoft Rocketbox LICENSE' },
              ],
            };
          },
        },
      },
    });
    const gen = makePick('own-decal', 'texture', {
      source: { type: 'generated', generator: 'decals', decal: 'handprint', variants: 3 },
      credits: { changes: 'Resized and recoloured' },
      sizeException: { maxBytes: 9_000_000, reason: 'accepted for test' },
    });
    const r = await runFetch({ picks: [gen], env });
    expect(r.failed).toEqual([]);
    const manifest = JSON.parse(await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8'));
    const lic = manifest.files['textures/own-decal/LICENSE'];
    expect(lic.changes).toBe('Copied unchanged from the Rocketbox repository (MIT license text).');
    expect(manifest.files['textures/own-decal/own-decal_a.webp'].changes).toBe('Resized and recoloured');
    expect(manifest.files['textures/own-decal/own-decal_a.webp'].sizeException).toEqual({ maxBytes: 9_000_000, reason: 'accepted for test' });
    expect(await readFile(roots.creditsFile, 'utf8')).toContain('Copied unchanged from the Rocketbox repository (MIT license text).');
  });

  it('runs an injected generator hook and publishes its files', async () => {
    const { env, roots } = await makeEnv({
      env: {
        generators: {
          generated: async (pick, { outDir }) => {
            await writeFile(path.join(outDir, `${pick.id}_a.webp`), 'gen');
            return { files: [{ fileName: `${pick.id}_a.webp`, path: path.join(outDir, `${pick.id}_a.webp`), bytes: 3 }] };
          },
        },
      },
    });
    const gen = makePick('own-decal', 'texture', { source: { type: 'generated', generator: 'decals', decal: 'handprint', variants: 3 } });
    const r = await runFetch({ picks: [gen], env });
    expect(r.failed).toEqual([]);
    expect(await exists(path.join(roots.assetRoot, 'textures', 'own-decal', 'own-decal_a.webp'))).toBe(true);
  });
});

describe('helpers', () => {
  it('path guard allows only the permitted roots', async () => {
    const { roots } = await makeEnv();
    expect(() => assertWritable(path.join(roots.assetRoot, 'x', 'y.bin'), roots)).not.toThrow();
    expect(() => assertWritable(path.join(roots.cacheRoot, 'work', 'a'), roots)).not.toThrow();
    expect(() => assertWritable(roots.creditsFile, roots)).not.toThrow();
    expect(() => assertWritable(path.join(roots.cacheRoot, 'manual', 'README.md'), roots)).not.toThrow();
    expect(() => assertWritable(path.join(roots.cacheRoot, 'manual', 'a', 'f.wav'), roots)).toThrow(/manual cache/);
    expect(() => assertWritable(path.join(roots.repoRoot, 'web', 'src', 'x.ts'), roots)).toThrow(/path guard/);
  });

  it('normalises map names for the texture converter', () => {
    expect(mapName('nor_gl')).toBe('nor-gl');
    expect(mapName('Diffuse')).toBe('diffuse');
  });

  it('computes the exit code and report', () => {
    const base = { written: [], skipped: [], refused: [], failed: [], missing: [], exitCode: 0, budgets: null };
    expect(exitCodeFor(base)).toBe(0);
    expect(exitCodeFor({ ...base, missing: [{}] })).toBe(1);
    expect(exitCodeFor({ ...base, budgets: { exitCode: 0, exceeded: ['total'], unreadable: [] } })).toBe(1);
    expect(formatRunReport(base)).toContain('summary: 0 written');
  });
});

describe('production downloader', () => {
  it('fetches Rocketbox textures and LICENSE at the pinned SHA', async () => {
    const sha = 'a'.repeat(40);
    const fbx = `https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/${sha}/Assets/Avatars/P/Bob/Export/Bob.fbx`;
    expect(parseRocketboxUrl(fbx)).toEqual({ sha, dir: 'Assets/Avatars/P/Bob' });
    const requested = [];
    const fakeFetch = async (url) => {
      requested.push(String(url));
      if (String(url).startsWith('https://api.github.com/')) {
        return new Response(
          JSON.stringify([{ name: 'Bob_color.tga', type: 'file', download_url: `https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/${sha}/Assets/Avatars/P/Bob/Textures/Bob_color.tga` }]),
        );
      }
      return new Response(`bytes of ${url}`);
    };
    const dl = makeRealDownloader({ fetch: fakeFetch, userAgent: 'test-agent', delays: [] });
    const pick = makePick('rocketbox-bob', 'avatar', { source: { type: 'url', url: fbx } });
    const { env, roots } = await makeEnv();
    void env;
    const dir = path.join(roots.cacheRoot, 'downloads', 'rocketbox-bob');
    await mkdir(dir, { recursive: true });
    const record = await dl(pick, dir);
    expect(record.files.map((f) => f.file)).toEqual(['Bob.fbx', 'Textures/Bob_color.tga', 'LICENSE']);
    expect(record.sourceUrls).toHaveLength(3);
    expect(requested.some((u) => u.endsWith(`/${sha}/LICENSE.md`))).toBe(true);
  });
});
