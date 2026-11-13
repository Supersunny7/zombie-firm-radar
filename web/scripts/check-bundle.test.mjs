// @vitest-environment node
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CRITICAL_ASSET_KEYS as TS_KEYS } from '../src/scenes/graveyard/assets';
import {
  CRITICAL_ASSET_KEYS,
  GROUP_BUDGET_BYTES,
  GROUP_FILE_LIMIT_BYTES,
  computeGroupBudget,
  computeInitialDownload,
  criticalAssetBytes,
} from './check-bundle.mjs';

describe('check-bundle initial download', () => {
  it('keeps the critical key list equal to the TypeScript one', () => {
    expect([...CRITICAL_ASSET_KEYS]).toEqual([...TS_KEYS]);
  });

  it('sums manifest bytes and throws on a missing key', () => {
    const files = { a: { bytes: 10 }, b: { bytes: 5 } };
    expect(criticalAssetBytes(files, ['a', 'b'])).toBe(15);
    expect(() => criticalAssetBytes(files, ['a', 'c'])).toThrow(/"c"/);
  });

  it('passes at the limit and fails above it with the exact message', () => {
    expect(computeInitialDownload({ assetBytes: 24_000_000, jsGzipBytes: 1_000_000 }).message).toBe(
      null,
    );
    const over = computeInitialDownload({ assetBytes: 24_000_000, jsGzipBytes: 1_100_000 });
    expect(over.over).toBe(true);
    expect(over.message).toBe('Initial download 25.1 MB exceeds the 25 MB limit');
  });
});

// Feature: graveyard-horror-pass, Property 3: Group budget accounting is exact
// Validates: Requirements 3.13, 5.6, 5.7, 5.8, 5.10
describe('computeGroupBudget (Property 3)', () => {
  const bytesArb = fc.integer({ min: 0, max: GROUP_FILE_LIMIT_BYTES });
  const setupArb = fc.record({
    cats: fc.array(fc.array(bytesArb, { maxLength: 12 }), { minLength: 1, maxLength: 5 }),
    hdri: fc.array(fc.integer({ min: 0, max: 30_000_000 }), { maxLength: 3 }),
  });

  const build = ({ cats, hdri }) => {
    const files = {};
    const categories = {};
    cats.forEach((list, i) => {
      categories[`cat${i}`] = list.map((bytes, j) => {
        const key = `cat${i}/f${j}`;
        files[key] = { bytes };
        return key;
      });
    });
    const hdriKeys = hdri.map((bytes, j) => {
      const key = `hdri/h${j}`;
      files[key] = { bytes };
      return key;
    });
    return { files, groups: { categories, hdri: hdriKeys } };
  };
  const sum = (a) => a.reduce((s, n) => s + n, 0);

  it('sums exactly per category and total, with HDRI separate', () => {
    fc.assert(
      fc.property(setupArb, (setup) => {
        const { files, groups } = build(setup);
        const r = computeGroupBudget(files, groups);
        setup.cats.forEach((list, i) => expect(r.categories[`cat${i}`]).toBe(sum(list)));
        const total = sum(setup.cats.map(sum));
        expect(r.totalWithoutHdri).toBe(total);
        expect(r.hdriBytes).toBe(sum(setup.hdri));
        expect(r.totalWithHdri).toBe(total + sum(setup.hdri));
        expect(r.over).toBe(total > GROUP_BUDGET_BYTES);
        if (total > GROUP_BUDGET_BYTES) {
          expect(r.ok).toBe(false);
          const msg = r.messages.join('\n');
          expect(msg).toContain(String(total));
          expect(msg).toContain(String(GROUP_BUDGET_BYTES));
        } else {
          expect(r.ok).toBe(true);
          expect(r.messages).toEqual([]);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('HDRI bytes never change the group total or the over-budget verdict', () => {
    fc.assert(
      fc.property(setupArb, fc.integer({ min: 0, max: 100_000_000 }), (setup, extra) => {
        const a = build(setup);
        const b = build({ ...setup, hdri: [...setup.hdri, extra] });
        const ra = computeGroupBudget(a.files, a.groups);
        const rb = computeGroupBudget(b.files, b.groups);
        expect(rb.totalWithoutHdri).toBe(ra.totalWithoutHdri);
        expect(rb.over).toBe(ra.over);
      }),
      { numRuns: 100 },
    );
  });

  it('fails on a missing key', () => {
    fc.assert(
      fc.property(setupArb, (setup) => {
        const { files, groups } = build(setup);
        groups.categories.cat0.push('nope/missing');
        const r = computeGroupBudget(files, groups);
        expect(r.ok).toBe(false);
        expect(r.messages.join('\n')).toContain('nope/missing');
      }),
      { numRuns: 100 },
    );
  });

  it('fails on non-finite or non-numeric bytes', () => {
    fc.assert(
      fc.property(
        setupArb,
        fc.constantFrom(NaN, Infinity, -Infinity, undefined, null, '5'),
        (setup, bad) => {
          const { files, groups } = build(setup);
          files['bad/file'] = { bytes: bad };
          groups.categories.cat0.push('bad/file');
          const r = computeGroupBudget(files, groups);
          expect(r.ok).toBe(false);
          expect(r.messages.join('\n')).toContain('bad/file');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('fails on a group file above 5,000,000 bytes', () => {
    fc.assert(
      fc.property(
        setupArb,
        fc.integer({ min: GROUP_FILE_LIMIT_BYTES + 1, max: 40_000_000 }),
        (setup, big) => {
          const { files, groups } = build(setup);
          files['big/file'] = { bytes: big };
          groups.categories.cat0.push('big/file');
          const r = computeGroupBudget(files, groups);
          expect(r.ok).toBe(false);
          expect(r.messages.join('\n')).toContain('big/file');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('passes exactly at the budget and fails one byte above', () => {
    const files = {};
    const keys = [];
    for (let i = 0; i < 5; i++) {
      files[`f${i}`] = { bytes: 5_000_000 };
      keys.push(`f${i}`);
    }
    expect(computeGroupBudget(files, { categories: { a: keys }, hdri: [] }).ok).toBe(true);
    files.extra = { bytes: 1 };
    const r = computeGroupBudget(files, { categories: { a: [...keys, 'extra'] }, hdri: [] });
    expect(r.ok).toBe(false);
    expect(r.messages[0]).toContain('25000001');
  });
});
