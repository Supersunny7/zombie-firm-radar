// Shared fakes for orchestrator tests: temp roots, picks, a recording downloader and fake converters.
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildRecord } from '../cache.mjs';

export const CREDITS_SEED = `# Credits

## Assets

| Path | Title | Author | Source URL | License | Changes we made |
| --- | --- | --- | --- | --- | --- |
`;

/** Fresh temp repo layout; credits file is a seeded copy, never the real CREDITS.md. */
export async function makeRoots() {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'asset-run-'));
  const roots = {
    repoRoot,
    assetRoot: path.join(repoRoot, 'web', 'public', 'assets'),
    cacheRoot: path.join(repoRoot, 'tools', 'cache'),
    creditsFile: path.join(repoRoot, 'CREDITS.md'),
  };
  await writeFile(roots.creditsFile, CREDITS_SEED);
  return roots;
}

export function makePick(id, kind, overrides = {}) {
  const base = {
    id,
    kind,
    category: 1,
    group: 'graveyard',
    source: { type: 'url', url: `https://example.org/${id}.bin` },
    manual: false,
    expectedFile: null,
    targetFolder: null,
    edits: [],
    credits: {
      title: `Title ${id}`,
      author: 'Some Author',
      sourceUrl: `https://example.org/page/${id}`,
      license: 'CC0',
      changes: 'Test conversion',
    },
  };
  return { ...base, ...overrides, credits: { ...base.credits, ...(overrides.credits ?? {}) } };
}

const digest = (...parts) => createHash('sha256').update(parts.join('|')).digest('hex');

/** Downloader fake: writes deterministic bytes, records every call. */
export function makeDownloader({ failIds = [] } = {}) {
  const calls = [];
  const download = async (pick, dir) => {
    calls.push(pick.id);
    if (failIds.includes(pick.id)) throw new Error('network down');
    await mkdir(dir, { recursive: true });
    const name = pick.kind === 'hdri' ? `${pick.id}.hdr` : pick.kind === 'texture' ? `${pick.id}.png` : `${pick.id}.glb`;
    await writeFile(path.join(dir, name), `source:${pick.id}`);
    return buildRecord(dir, [name], [pick.source.url ?? 'https://example.org/x']);
  };
  return { download, calls };
}

/** Fake converters: bytes are derived from the input content. */
export function makeConverters({ failIds = [] } = {}) {
  const calls = [];
  const guard = (pick) => {
    calls.push(pick.id);
    if (failIds.includes(pick.id)) throw new Error('converter boom');
  };
  return {
    calls,
    texture: async (pick, inputs, out) => {
      guard(pick);
      const files = [];
      for (const i of inputs) {
        const fileName = `${pick.id}_${i.map}.webp`;
        const data = `webp:${digest(await readFile(i.path, 'utf8'))}`;
        await writeFile(path.join(out, fileName), data);
        files.push({ fileName, path: path.join(out, fileName), bytes: data.length, map: i.map });
      }
      return { files, warnings: [] };
    },
    hdri: async (pick, input) => {
      guard(pick);
      const bytes = new Uint8Array(Buffer.from(`hdr:${digest(await readFile(input, 'utf8'))}`));
      return { ok: true, produced: [{ fileName: `${pick.id}_${pick.source.resolution ?? '1k'}.hdr`, bytes }] };
    },
    model: async (pick, input, out) => {
      guard(pick);
      const data = `glb:${digest(await readFile(input.path, 'utf8'))}`;
      await writeFile(path.join(out, `${pick.id}.glb`), data);
      return { files: [{ fileName: `${pick.id}.glb`, path: path.join(out, `${pick.id}.glb`), bytes: data.length, kind: 'model' }], warnings: [], bip01: false };
    },
    audio: async ({ input, outDir, name }) => {
      calls.push(name);
      if (failIds.includes(name)) throw new Error('converter boom');
      const files = [];
      for (const ext of ['ogg', 'mp3']) {
        const p = path.join(outDir, `${name}.${ext}`);
        const data = `${ext}:${digest(await readFile(input, 'utf8'))}`;
        await writeFile(p, data);
        files.push({ path: p, bytes: data.length });
      }
      return { files, warnings: [] };
    },
  };
}

export async function makeEnv(overrides = {}) {
  const roots = overrides.roots ?? (await makeRoots());
  const dl = makeDownloader(overrides.downloader);
  const convert = makeConverters(overrides.converters);
  return {
    env: { roots, download: dl.download, convert, recipeVersions: { test: '1' }, pid: 'test', ...(overrides.env ?? {}) },
    roots,
    downloadCalls: dl.calls,
    convertCalls: convert.calls,
  };
}
