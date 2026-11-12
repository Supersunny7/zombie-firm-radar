import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyTreatment } from './apply';
import { seedFrom } from './hash';
import { drawOutcome } from './outcome';
import { simulate } from './simulate';
import {
  arbCik,
  arbDelta,
  arbIsoDate,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';

const NUM_RUNS = 100;

// Feature: rescue-engine, Property 15: The same seed always gives the same outcome (RR-6)
// **Validates: Requirements 2.4, 8.12, 9.9, 10.7, 13.7**
describe('Property 15: The same seed always gives the same outcome (RR-6)', () => {
  it('applyTreatment twice is deeply equal and leaves arguments unchanged', () => {
    fc.assert(
      fc.property(arbValidFirm, arbTreatment, arbDelta, arbMacroValid, (firm, t, delta, macro) => {
        const before = structuredClone({ firm, t, macro });
        const a = applyTreatment(firm, t, delta, macro);
        const b = applyTreatment(firm, t, delta, macro);
        expect(a).toStrictEqual(b);
        expect({ firm, t, macro }).toStrictEqual(before);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('simulate twice with the same seed is deeply equal and leaves arguments unchanged', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        fc.integer({ min: 1, max: 200 }),
        (firm, t, delta, macro, seed, paths) => {
          const before = structuredClone({ firm, t, macro });
          const a = simulate(firm, t, delta, macro, { paths, seed });
          const b = simulate(firm, t, delta, macro, { paths, seed });
          expect(a).toStrictEqual(b);
          expect({ firm, t, macro }).toStrictEqual(before);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('drawOutcome twice with the same seed is deeply equal and leaves arguments unchanged', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        (firm, t, delta, macro, seed) => {
          const before = structuredClone({ firm, t, macro });
          const a = drawOutcome(firm, t, delta, macro, seed);
          const b = drawOutcome(firm, t, delta, macro, seed);
          expect(a).toStrictEqual(b);
          expect({ firm, t, macro }).toStrictEqual(before);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('seedFrom twice is deeply equal, and drawOutcome with that seed repeats exactly', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbCik,
        arbIsoDate,
        (firm, t, delta, macro, cik, date) => {
          const before = structuredClone({ t, cik, date });
          const s1 = seedFrom(cik, t, date);
          const s2 = seedFrom(cik, t, date);
          expect(s1).toStrictEqual(s2);
          expect({ t, cik, date }).toStrictEqual(before);
          if (!s1.ok) throw new Error('seedFrom rejected valid input');
          const a = drawOutcome(firm, t, delta, macro, s1.value);
          const b = drawOutcome(firm, t, delta, macro, s1.value);
          expect(a).toStrictEqual(b);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
