import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { tornMoundSet } from './tornMound';

const cikArb = fc.integer({ min: 0, max: 40 }).map((n) => String(n).padStart(10, '0'));
const cikListArb = fc.array(cikArb, { maxLength: 30 });

describe('tornMoundSet', () => {
  // Feature: graveyard-horror-pass, Property 8: A torn mound is never removed under a character
  it('equals the union of undead and active ciks; a firm leaves only when neither', () => {
    // **Validates: Requirements 7.5**
    fc.assert(
      fc.property(cikListArb, cikListArb, cikArb, (torn, active, probe) => {
        const result = tornMoundSet(torn, active);
        const union = new Set<string>([...torn, ...active]);

        expect(result.size).toBe(union.size);
        for (const cik of union) expect(result.has(cik)).toBe(true);
        for (const cik of result) expect(union.has(cik)).toBe(true);

        // A firm that is torn or active is never absent; absent only if neither.
        if (!result.has(probe)) {
          expect(torn.includes(probe)).toBe(false);
          expect(active.includes(probe)).toBe(false);
        }
        // Removing a cik from torn while it is still active keeps it in the set.
        const tornWithout = torn.filter((c) => c !== probe);
        if (active.includes(probe)) {
          expect(tornMoundSet(tornWithout, active).has(probe)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});
