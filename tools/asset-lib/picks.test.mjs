import { describe, it, expect } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPicks, validatePick, validatePicks, orderPicks } from './picks.mjs';

const credits = { title: 't', author: 'a', sourceUrl: 'https://x.test/y', license: 'CC0', changes: 'none' };
const base = (over = {}) => ({
  id: 'a-one', kind: 'texture', category: 1, group: 'graveyard',
  source: { type: 'polyhaven', id: 'x', resolution: '1k' },
  manual: false, expectedFile: null, targetFolder: null, edits: [], credits, ...over,
});
const manualPick = (over = {}) => base({
  id: 'm-one', kind: 'model', group: 'lab',
  source: { type: 'manual', pageUrl: 'https://s.test/m', downloadOption: 'glTF zip' },
  manual: true, expectedFile: 'm.zip', targetFolder: 'tools/cache/manual/m-one', ...over,
});
const codes = (errs) => errs.map((e) => e.code);

describe('validatePick', () => {
  it('accepts an optional description string and rejects an empty one', () => {
    expect(validatePick(manualPick({ description: 'lab, medical cart' }))).toEqual([]);
    expect(codes(validatePick(manualPick({ description: '' })))).toContain('InvalidField');
  });

  it('accepts valid polyhaven and manual picks', () => {
    expect(validatePick(base())).toEqual([]);
    expect(validatePick(manualPick())).toEqual([]);
  });
  it('rejects unknown keys, in pick, source and credits', () => {
    expect(codes(validatePick(base({ extra: 1 })))).toContain('UnknownKey');
    expect(codes(validatePick(base({ source: { type: 'url', url: 'u', bogus: 1 } })))).toContain('UnknownKey');
    expect(codes(validatePick(base({ credits: { ...credits, x: 1 } })))).toContain('UnknownKey');
  });
  it('rejects manual flag that disagrees with source.type', () => {
    const e = validatePick(base({ manual: true }));
    expect(e[0]).toMatchObject({ id: 'a-one', code: 'ManualMismatch' });
    expect(codes(validatePick(manualPick({ manual: false })))).toContain('ManualMismatch');
  });
  it('requires expectedFile only for manual picks', () => {
    expect(validatePick(base({ expectedFile: 'f.zip' })).length).toBeGreaterThan(0);
    expect(validatePick(manualPick({ expectedFile: null })).length).toBeGreaterThan(0);
  });
  it('rejects edits not in the edit table and bad params', () => {
    expect(codes(validatePick(base({ edits: [{ op: 'blur' }] })))).toContain('UnknownEdit');
    expect(codes(validatePick(base({ edits: [{ op: 'decimate', triangles: -1 }] })))).toContain('InvalidEdit');
    expect(codes(validatePick(base({ edits: [{ op: 'removeNode' }] })))).toContain('InvalidEdit');
    expect(validatePick(base({ edits: [{ op: 'decimate', triangles: 20000 }, { op: 'removeNode', node: 'N' }] }))).toEqual([]);
  });
  it('accepts a splitMesh edit with parts', () => {
    const edit = { op: 'splitMesh', mesh: 'S', by: 'components', parts: [{ name: 'h', components: [0] }, { name: 'b', rest: true }] };
    expect(validatePick(manualPick({ edits: [edit] }))).toEqual([]);
  });
  it('requires non-empty credits fields and a valid group', () => {
    expect(codes(validatePick(base({ credits: { ...credits, author: ' ' } })))).toContain('MissingField');
    expect(validatePick(base({ group: 'crypt' })).length).toBeGreaterThan(0);
  });
});

describe('validatePicks', () => {
  it('rejects duplicate ids, reported by id', () => {
    const r = validatePicks({ version: 2, picks: [base(), base()] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContainEqual(expect.objectContaining({ id: 'a-one', code: 'DuplicateId' }));
  });
  it('rejects derived.from that is not an id in the file', () => {
    const d = base({ id: 'd-one', source: { type: 'derived', script: 's', from: 'nope', seed: 1 } });
    const r = validatePicks({ version: 2, picks: [d] });
    expect(r.errors).toContainEqual(expect.objectContaining({ id: 'd-one', code: 'UnknownDerivedFrom' }));
  });
  it('rejects a wrong version and a derivation cycle', () => {
    expect(validatePicks({ version: 1, picks: [] }).ok).toBe(false);
    const a = base({ id: 'a', source: { type: 'derived', script: 's', from: 'b', seed: 1 } });
    const b = base({ id: 'b', source: { type: 'derived', script: 's', from: 'a', seed: 1 } });
    expect(codes(validatePicks({ version: 2, picks: [a, b] }).errors)).toContain('DerivedCycle');
  });
  it('orders derived picks after their source', () => {
    const d = base({ id: 'a-derived', source: { type: 'derived', script: 's', from: 'z-src', seed: 1 } });
    const src = base({ id: 'z-src' });
    const r = validatePicks({ version: 2, picks: [d, src] });
    expect(r.ok).toBe(true);
    expect(r.picks.map((p) => p.id)).toEqual(['z-src', 'a-derived']);
    expect(orderPicks([src, d]).ordered.map((p) => p.id)).toEqual(['z-src', 'a-derived']);
  });
});

describe('loadPicks', () => {
  it('loads a file and reports parse and read errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'picks-'));
    try {
      const good = join(dir, 'p.json');
      await writeFile(good, JSON.stringify({ version: 2, picks: [base()] }));
      expect((await loadPicks(good)).ok).toBe(true);
      const bad = join(dir, 'bad.json');
      await writeFile(bad, '{nope');
      expect((await loadPicks(bad)).errors[0].code).toBe('ParseError');
      expect((await loadPicks(join(dir, 'missing.json'))).errors[0].code).toBe('ReadError');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
