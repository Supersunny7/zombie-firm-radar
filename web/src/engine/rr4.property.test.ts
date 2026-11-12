import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { simulate } from './simulate';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';
import type { ToolChoice, Treatment } from './types';

const REFINANCE: ToolChoice = { name: 'refinance', params: {} };

/** Half of the treatments are forced to include refinance (replacing a tool if already 3). */
const arbTreatmentWithRefinance: fc.Arbitrary<Treatment> = fc
  .tuple(arbTreatment, fc.boolean())
  .map(([t, force]): Treatment => {
    if (!force || t.some((x) => x.name === 'refinance')) return t;
    return t.length >= 3 ? [...t.slice(0, 2), REFINANCE] : [...t, REFINANCE];
  });

/** 0 <= d1 <= d2 <= 0.05, including d1 = d2 and the endpoints. */
const arbDeltaPair: fc.Arbitrary<readonly [number, number]> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc
      .tuple(arbDelta, arbDelta)
      .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as const),
  },
  { weight: 1, arbitrary: arbDelta.map((d) => [d, d] as const) },
  { weight: 1, arbitrary: fc.constant([0, 0.05] as const) },
);

describe('RR-4: a higher rate shock never gives higher survival odds (property)', () => {
  // Feature: rescue-engine, Property 13: A higher rate shock never gives higher survival odds (RR-4)
  // **Validates: Requirements 13.5**
  it('survivalOdds(d2) <= survivalOdds(d1) exactly for d1 <= d2', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbMacroValid,
        arbTreatmentWithRefinance,
        arbSeed,
        fc.integer({ min: 1, max: 200 }),
        arbDeltaPair,
        (firm, macro, treatment, seed, paths, [d1, d2]) => {
          const low = simulate(firm, treatment, d1, macro, { paths, seed });
          const high = simulate(firm, treatment, d2, macro, { paths, seed });
          expect(low.ok).toBe(true);
          expect(high.ok).toBe(true);
          if (!low.ok || !high.ok) return;
          expect(high.value.survivalOdds).toBeLessThanOrEqual(low.value.survivalOdds);
        },
      ),
      { numRuns: 200 },
    );
  });
});
