// Feature: asset-pipeline, Property 4: Manifest has one complete entry per written file
// **Validates: Requirements 18.1**
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_TEXT_FIELDS,
  buildManifest,
  findStaleKeys,
  manifestKey,
  mergeManifest,
  mergeManifestWithReport,
  parseManifest,
  serializeManifest,
  writeManifest,
} from './manifest.mjs';

const NUM_RUNS = 100;

const segment = fc.stringMatching(/^[a-z0-9_]{1,8}$/);
const relPathArb = fc
  .array(segment, { minLength: 1, maxLength: 3 })
  .map((parts) => parts.join('/') + '.glb');
const textArb = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,15}$/);

const entryArb = fc.record({
  relPath: relPathArb,
  pick: fc.option(textArb, { nil: undefined }),
  title: fc.option(textArb, { nil: undefined }),
  author: textArb,
  sourceUrl: textArb.map((t) => `https://example.org/${t.replace(/ /g, '_')}`),
  license: fc.constantFrom('CC0', 'CC BY', 'MIT', 'Our own work'),
  changes: textArb,
  group: fc.option(textArb, { nil: undefined }),
  bytes: fc.nat(),
  sha256: fc.stringMatching(/^[0-9a-f]{64}$/),
});

const entriesArb = fc.array(entryArb, { maxLength: 12 });

/** An entry with one required field blanked. */
const badEntryArb = fc
  .tuple(entryArb, fc.constantFrom(...REQUIRED_TEXT_FIELDS), fc.constantFrom('', '   ', undefined))
  .map(([e, field, blank]) => ({ ...e, [field]: blank }));

describe('Property 4: manifest has one complete entry per written file', () => {
  it('buildManifest has exactly one complete entry per distinct key', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const m = buildManifest(entries);
        const keys = new Set(entries.map((e) => manifestKey(e.relPath)));
        expect(Object.keys(m.files).sort()).toEqual([...keys].sort());
        for (const entry of Object.values(m.files)) {
          for (const f of REQUIRED_TEXT_FIELDS) {
            expect(typeof entry[f]).toBe('string');
            expect(entry[f].trim()).not.toBe('');
          }
        }
        // last write wins for a repeated key
        for (const k of keys) {
          const last = [...entries].reverse().find((e) => manifestKey(e.relPath) === k);
          expect(m.files[k].sha256).toBe(last.sha256);
          expect(m.files[k].author).toBe(last.author);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('merge never removes other keys and replaces by key', () => {
    fc.assert(
      fc.property(entriesArb, entriesArb, (a, b) => {
        const prev = buildManifest(a);
        const merged = mergeManifest(prev, b);
        for (const k of Object.keys(prev.files)) expect(k in merged.files).toBe(true);
        for (const e of b) expect(merged.files[manifestKey(e.relPath)].sha256).toBe(
          [...b].reverse().find((x) => manifestKey(x.relPath) === manifestKey(e.relPath)).sha256,
        );
        // prev is not mutated
        expect(Object.keys(prev.files).sort()).toEqual(
          [...new Set(a.map((e) => manifestKey(e.relPath)))].sort(),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('refuses incomplete entries: no key written, previous entry kept, refusal reported', () => {
    fc.assert(
      fc.property(entriesArb, badEntryArb, (good, bad) => {
        const prev = buildManifest(good);
        const before = serializeManifest(prev);
        const { manifest, refused } = mergeManifestWithReport(prev, [bad]);
        expect(serializeManifest(manifest)).toBe(before);
        expect(refused).toHaveLength(1);
        expect(refused[0].problems.length).toBeGreaterThan(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('serialisation is stable, order independent, LF-terminated and round-trips', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        // dedupe by key so reversing cannot change which entry wins
        const uniq = [...new Map(entries.map((e) => [manifestKey(e.relPath), e])).values()];
        const text = serializeManifest(buildManifest(uniq));
        expect(serializeManifest(buildManifest([...uniq].reverse()))).toBe(text);
        expect(text.endsWith('\n')).toBe(true);
        expect(text).not.toContain('\r');
        const parsed = parseManifest(text);
        expect(serializeManifest(parsed)).toBe(text);
        const keys = Object.keys(JSON.parse(text).files);
        expect(keys).toEqual([...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('findStaleKeys lists exactly the keys without a file on disk, sorted', () => {
    fc.assert(
      fc.property(entriesArb, fc.func(fc.boolean()), (entries, keep) => {
        const m = buildManifest(entries);
        const keys = Object.keys(m.files);
        const onDisk = keys.filter((k) => keep(k));
        const stale = findStaleKeys(m, onDisk);
        expect(stale).toEqual(keys.filter((k) => !onDisk.includes(k)).sort());
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('parseManifest yields an empty manifest for malformed text', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const m = parseManifest(`{${s}`);
        expect(m.files).toEqual({});
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('writeManifest writes the serialised bytes atomically (no temp file left)', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'manifest-prop-'));
    try {
      await fc.assert(
        fc.asyncProperty(entriesArb, async (entries) => {
          const m = buildManifest(entries);
          const target = await writeManifest(dir, m);
          expect(await readFile(target, 'utf8')).toBe(serializeManifest(m));
          expect(await readdir(dir)).toEqual(['manifest.json']);
        }),
        { numRuns: NUM_RUNS },
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
