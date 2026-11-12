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
import { parseTreatment } from './treatment';
import type { Treatment } from './types';

const NUM_RUNS = 100;

/** A valid Treatment and a full-length permutation of it (a different click order). */
const arbTreatmentPair: fc.Arbitrary<{ a: Treatment; b: Treatment }> = arbTreatment.chain((a) =>
  fc
    .shuffledSubarray([...a], { minLength: a.length, maxLength: a.length })
    .map((b) => ({ a, b: structuredClone(b) as Treatment })),
);

// Feature: rescue-engine, Property 6: Click order never matters
// **Validates: Requirements 3.9, 6.1, 7.1, 7.9, 10.6**
describe('Property 6: Click order never matters', () => {
  it('parseTreatment returns deeply equal results for any permutation', () => {
    fc.assert(
      fc.property(arbTreatmentPair, ({ a, b }) => {
        expect(parseTreatment(b)).toStrictEqual(parseTreatment(a));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('applyTreatment (including the Refinance_Note) is deeply equal for any permutation', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatmentPair,
        arbDelta,
        arbMacroValid,
        (firm, { a, b }, delta, macro) => {
          expect(applyTreatment(firm, b, delta, macro)).toStrictEqual(
            applyTreatment(firm, a, delta, macro),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('simulate is deeply equal for any permutation', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatmentPair,
        arbDelta,
        arbMacroValid,
        arbSeed,
        fc.integer({ min: 1, max: 200 }),
        (firm, { a, b }, delta, macro, seed, paths) => {
          expect(simulate(firm, b, delta, macro, { paths, seed })).toStrictEqual(
            simulate(firm, a, delta, macro, { paths, seed }),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('drawOutcome is deeply equal for any permutation', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatmentPair,
        arbDelta,
        arbMacroValid,
        arbSeed,
        (firm, { a, b }, delta, macro, seed) => {
          expect(drawOutcome(firm, b, delta, macro, seed)).toStrictEqual(
            drawOutcome(firm, a, delta, macro, seed),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('seedFrom is deeply equal for any permutation', () => {
    fc.assert(
      fc.property(arbCik, arbTreatmentPair, arbIsoDate, (cik, { a, b }, date) => {
        expect(seedFrom(cik, b, date)).toStrictEqual(seedFrom(cik, a, date));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
