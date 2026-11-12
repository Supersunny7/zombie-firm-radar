import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildManifest,
  findStaleKeys,
  mergeManifest,
  mergeManifestWithReport,
  parseManifest,
  serializeManifest,
  writeManifest,
} from './manifest.mjs';

const entry = (relPath, over = {}) => ({
  relPath,
  pick: 'p',
  title: 'T',
  author: 'A',
  sourceUrl: 'https://example.org/x',
  license: 'CC0',
  changes: 'Converted',
  group: 'graveyard',
  bytes: 10,
  sha256: 'aa',
  inputsSha256: 'bb',
  recipe: 'cc',
  ...over,
});

describe('manifest', () => {
  let dir;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'manifest-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('builds one key per file and strips relPath from entries', () => {
    const m = buildManifest([entry('models/a.glb'), entry('models/b.glb')]);
    expect(Object.keys(m.files)).toEqual(['models/a.glb', 'models/b.glb']);
    expect(m.files['models/a.glb']).not.toHaveProperty('relPath');
    expect(m.version).toBe(1);
  });

  it('refuses entries with empty author, sourceUrl, license or changes', () => {
    for (const f of ['author', 'sourceUrl', 'license', 'changes']) {
      const { manifest, refused } = mergeManifestWithReport(undefined, [
        entry('a.glb', { [f]: '  ' }),
      ]);
      expect(manifest.files).toEqual({});
      expect(refused[0].problems).toContain(`${f} is empty`);
    }
  });

  it('replaces by key and never removes other keys', () => {
    const prev = buildManifest([entry('a.glb'), entry('b.glb')]);
    const next = mergeManifest(prev, [entry('a.glb', { title: 'New' })]);
    expect(Object.keys(next.files)).toEqual(['a.glb', 'b.glb']);
    expect(next.files['a.glb'].title).toBe('New');
    expect(prev.files['a.glb'].title).toBe('T');
  });

  it('keeps the previous entry when the replacement is refused', () => {
    const prev = buildManifest([entry('a.glb')]);
    const next = mergeManifest(prev, [entry('a.glb', { license: '' })]);
    expect(next.files['a.glb'].license).toBe('CC0');
  });

  it('serialises deterministically: sorted keys, LF, trailing newline, no timestamps', () => {
    const a = buildManifest([entry('z.glb'), entry('a.glb', { title: 'X' })]);
    const b = buildManifest([entry('a.glb', { title: 'X' }), entry('z.glb')]);
    const sa = serializeManifest(a);
    expect(sa).toBe(serializeManifest(b));
    expect(sa.endsWith('}\n')).toBe(true);
    expect(sa).not.toContain('\r');
    expect(Object.keys(JSON.parse(sa).files)).toEqual(['a.glb', 'z.glb']);
    expect(sa).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(sa).toContain('\n  "version": 1,');
  });

  it('orders entry fields identically regardless of input field order', () => {
    const e1 = entry('a.glb');
    const e2 = Object.fromEntries(Object.entries(e1).reverse());
    expect(serializeManifest(buildManifest([e1]))).toBe(serializeManifest(buildManifest([e2])));
  });

  it('round-trips through parseManifest', () => {
    const m = buildManifest([entry('a.glb')]);
    expect(serializeManifest(parseManifest(serializeManifest(m)))).toBe(serializeManifest(m));
    expect(parseManifest('not json')).toEqual({ version: 1, files: {} });
  });

  it('normalises backslash keys', () => {
    const m = buildManifest([entry('models\\a.glb')]);
    expect(Object.keys(m.files)).toEqual(['models/a.glb']);
  });

  it('reports stale keys', () => {
    const m = buildManifest([entry('a.glb'), entry('b.glb')]);
    expect(findStaleKeys(m, ['a.glb'])).toEqual(['b.glb']);
  });

  it('writes atomically and re-runs are byte-identical', async () => {
    const m = buildManifest([entry('a.glb')]);
    const p = await writeManifest(dir, m);
    const first = await readFile(p, 'utf8');
    await writeManifest(dir, m);
    expect(await readFile(p, 'utf8')).toBe(first);
    expect(first).toBe(serializeManifest(m));
    expect(await readdir(dir)).toEqual(['manifest.json']);
  });
});
