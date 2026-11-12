import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { account, accountBudgets, LIMITS } from './budgets.mjs';

// Feature: asset-pipeline, Property 2: Budget accounting invariants
// **Validates: Requirements 17.1, 17.2, 17.3, 17.6**

const META_NAMES = ['manifest.json', 'LICENSE.txt', 'license-rocketbox.md'];

// Sizes straddle the limits so both exceeded and non-exceeded cases occur.
const sizeArb = fc.oneof(
  fc.integer({ min: 0, max: 1_000_000 }),
  fc.integer({ min: 0, max: 40_000_000 }),
  fc.constantFrom(0, LIMITS.graveyard, LIMITS.graveyard + 1, LIMITS.total, LIMITS.total + 1),
);

const filesArb = fc
  .array(
    fc.record({
      bytes: sizeArb,
      group: fc.constantFrom('graveyard', 'lab', null),
      meta: fc.boolean(),
    }),
    { maxLength: 25 },
  )
  .map((rows) =>
    rows.map((r, i) => ({
      path: r.meta ? `d${i}/${META_NAMES[i % META_NAMES.length]}` : `models/f${i}.glb`,
      bytes: r.bytes,
      group: r.group,
      meta: r.meta,
    })),
  );

const sum = (xs) => xs.reduce((a, f) => a + f.bytes, 0);

describe('Property 2: Budget accounting invariants', () => {
  it('limits are exactly 26,214,400 / 26,214,400 / 62,914,560', () => {
    fc.assert(
      fc.property(filesArb, (files) => {
        const r = accountBudgets(files.map(({ path, bytes, group }) => ({ path, bytes, group })));
        expect(r.limit).toEqual({ graveyard: 26_214_400, lab: 26_214_400, total: 62_914_560 });
        expect(LIMITS).toEqual(r.limit);
      }),
      { numRuns: 100 },
    );
  });

  it('sums, exceeded set and unassigned follow the accounting rules', () => {
    fc.assert(
      fc.property(filesArb, (files) => {
        const r = account(files.map(({ path, bytes, group }) => ({ path, bytes, group })));

        const g = files.filter((f) => f.group === 'graveyard');
        const l = files.filter((f) => f.group === 'lab');
        expect(r.used.total).toBe(sum(files));
        expect(r.used.graveyard).toBe(sum(g));
        expect(r.used.lab).toBe(sum(l));
        expect(r.used.graveyard + r.used.lab).toBeLessThanOrEqual(r.used.total);

        // exceeded iff used > limit (equality passes)
        for (const n of ['graveyard', 'lab', 'total']) {
          expect(r.exceeded.includes(n)).toBe(r.used[n] > r.limit[n]);
        }

        // ungrouped files count in total only; every non-meta one is listed
        const expectedUnassigned = files.filter((f) => f.group === null && !f.meta).map((f) => f.path);
        expect([...r.unassigned].sort()).toEqual(expectedUnassigned.sort());
        for (const f of files.filter((f) => f.meta)) expect(r.unassigned).not.toContain(f.path);

        // no file dropped from the accounting
        expect(r.files).toHaveLength(files.length);
      }),
      { numRuns: 100 },
    );
  });

  it('equality passes and one byte over fails', () => {
    const at = account([{ path: 'a.glb', bytes: LIMITS.graveyard, group: 'graveyard' }]);
    expect(at.exceeded).not.toContain('graveyard');
    const over = account([{ path: 'a.glb', bytes: LIMITS.graveyard + 1, group: 'graveyard' }]);
    expect(over.exceeded).toContain('graveyard');
  });
});
