import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { planDressing } from './dressing';
import type { DressingInput } from './dressing';

const statusArb = fc.constantFrom<DressingInput['status']>(
  'zombie',
  'endangered',
  'healthy',
  'insufficient_data',
);

// Unique CIKs are not required by the plan, but real data has them.
const firmsArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 9_999_999_999 }), { maxLength: 60 })
  .chain((ciks) =>
    fc.tuple(
      fc.constant(ciks),
      fc.array(statusArb, { minLength: ciks.length, maxLength: ciks.length }),
      fc.array(fc.boolean(), { minLength: ciks.length, maxLength: ciks.length }),
    ),
  )
  .map(([ciks, statuses, flags]) => ({
    firms: ciks.map((c, i): DressingInput => ({
      cik: String(c).padStart(10, '0'),
      status: statuses[i] as DressingInput['status'],
    })),
    newlyUndead: Uint8Array.from(flags.map((f) => (f ? 1 : 0))),
  }));

describe('dressing plan properties', () => {
  // Feature: graveyard-horror-pass, Property 7: Every headstone has exactly one mound, and the plan follows the shock and lights
  // **Validates: Requirements 7.1, 7.4, 7.6, 7.10, 7.11, 10.6, 16.4**
  it('Property 7: torn/closed partition, stains and blood follow lights and undead set', () => {
    fc.assert(
      fc.property(firmsArb, fc.constantFrom('off' as const, 'on' as const), (data, lights) => {
        const { firms, newlyUndead } = data;
        const p = planDressing(firms, { newlyUndead }, lights);

        const expected = firms
          .map((f, i) => (f.status === 'zombie' || newlyUndead[i] === 1 ? i : -1))
          .filter((i) => i >= 0);
        expect(p.torn).toEqual(expected);
        expect(p.undead).toEqual(expected);
        expect(p.mounds).toEqual(expected);

        // Partition: disjoint, covers every firm exactly once.
        const all = [...p.torn, ...p.closed].sort((a, b) => a - b);
        expect(all).toEqual(firms.map((_, i) => i));
        expect(new Set(all).size).toBe(firms.length);

        const tornSet = new Set(p.torn);
        if (lights === 'on') {
          expect(p.stains).toEqual([]);
          expect(p.blood).toEqual([]);
        } else {
          expect(p.stains.map((s) => s.firm)).toEqual(p.torn);
          for (const s of p.stains) {
            expect(tornSet.has(s.firm)).toBe(true);
            expect(s.count).toBeGreaterThanOrEqual(0);
            expect(s.count).toBeLessThanOrEqual(3);
            expect(s.seeds).toHaveLength(s.count);
          }
          expect(p.blood.map((b) => b.firm)).toEqual(p.undead);
          for (const b of p.blood) {
            expect(b.count).toBeGreaterThanOrEqual(1);
            expect(b.count).toBeLessThanOrEqual(5);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
