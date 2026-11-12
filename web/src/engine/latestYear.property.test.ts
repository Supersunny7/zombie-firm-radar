import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyTreatment } from './apply';
import { diagnose } from './diagnose';
import { drawOutcome } from './outcome';
import { simulate } from './simulate';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';

const NUM_RUNS = 100;

/** A valid firm with a second copy whose years are permuted and margin_change_mean replaced. */
const arbFirmPair = arbValidFirm.chain((firm) =>
  fc
    .record({
      order: fc.shuffledSubarray(
        firm.years.map((_, i) => i),
        { minLength: firm.years.length, maxLength: firm.years.length },
      ),
      mcm: fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true }),
    })
    .map(({ order, mcm }) => {
      const modified = structuredClone(firm);
      modified.years = order.map((i) => structuredClone(firm.years[i]!));
      modified.rescue_inputs.margin_change_mean = mcm;
      return { firm, modified };
    }),
);

// Feature: rescue-engine, Property 8: Latest year selection and unused inputs
// **Validates: Requirements 4.8, 4.11**
describe('Property 8: Latest year selection and unused inputs', () => {
  it('diagnose and applyTreatment ignore year order and margin_change_mean', () => {
    fc.assert(
      fc.property(arbFirmPair, arbTreatment, arbDelta, arbMacroValid, (pair, t, delta, macro) => {
        expect(diagnose(pair.modified, delta, macro)).toStrictEqual(
          diagnose(pair.firm, delta, macro),
        );
        expect(applyTreatment(pair.modified, t, delta, macro)).toStrictEqual(
          applyTreatment(pair.firm, t, delta, macro),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('simulate ignores year order and margin_change_mean', () => {
    fc.assert(
      fc.property(
        arbFirmPair,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        fc.integer({ min: 1, max: 200 }),
        (pair, t, delta, macro, seed, paths) => {
          expect(simulate(pair.modified, t, delta, macro, { paths, seed })).toStrictEqual(
            simulate(pair.firm, t, delta, macro, { paths, seed }),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('drawOutcome ignores year order and margin_change_mean', () => {
    fc.assert(
      fc.property(
        arbFirmPair,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        (pair, t, delta, macro, seed) => {
          expect(drawOutcome(pair.modified, t, delta, macro, seed)).toStrictEqual(
            drawOutcome(pair.firm, t, delta, macro, seed),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
