import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCore } from './apply';
import { prepare } from './inputs';
import { projectPath } from './project';
import { arbBlock, arbDelta, arbMacroValid, arbValidFirm } from './test/engineArbitraries';
import type { ToolChoice } from './types';

const arbBool = (trueWeight: number): fc.Arbitrary<boolean> =>
  fc.oneof(
    { weight: trueWeight, arbitrary: fc.constant(true) },
    { weight: 1, arbitrary: fc.constant(false) },
  );

/** Parameter over [min, max] with both endpoints drawn as constants. */
const arbParam = (min: number, max: number): fc.Arbitrary<number> =>
  fc.oneof(
    { weight: 1, arbitrary: fc.constant(min) },
    { weight: 1, arbitrary: fc.constant(max) },
    { weight: 6, arbitrary: fc.double({ min, max, noNaN: true, noDefaultInfinity: true }) },
  );

/**
 * Base treatment T without debt_for_equity: any subset (0 to 3) of cut_costs,
 * sell_assets and refinance. Refinance is weighted to appear in about 75% of cases.
 */
const arbBase: fc.Arbitrary<readonly ToolChoice[]> = fc
  .record({
    cut: arbBool(1),
    c: arbParam(0, 0.08),
    sell: arbBool(1),
    s: arbParam(0, 0.3),
    refi: arbBool(3),
  })
  .map(({ cut, c, sell, s, refi }) => {
    const tools: ToolChoice[] = [];
    if (cut) tools.push({ name: 'cut_costs', params: { c } });
    if (sell) tools.push({ name: 'sell_assets', params: { s } });
    if (refi) tools.push({ name: 'refinance', params: {} });
    return tools;
  });

describe('RR-1: debt-for-equity never worsens coverage on the same path (property)', () => {
  // Feature: rescue-engine, Property 11: Debt-for-equity never worsens coverage on the same path (RR-1, amended)
  // **Validates: Requirements 13.1, 13.2, 13.11**
  it('part 1: ICR_t(with) >= ICR_t(T) when EBIT_t >= 0; part 2: a covered year stays covered', () => {
    let withRefinance = 0;
    fc.assert(
      fc.property(
        arbValidFirm,
        arbMacroValid,
        arbDelta,
        arbBlock,
        arbBase,
        arbParam(0, 0.6),
        (firm, macro, delta, block, base, w) => {
          const prepared = prepare(firm, delta, macro);
          expect(prepared.ok).toBe(true);
          if (!prepared.ok) return;
          const inputs = prepared.value;
          if (base.some((t) => t.name === 'refinance')) withRefinance++;

          const withTreatment: ToolChoice[] = [...base, { name: 'debt_for_equity', params: { w } }];
          const postBase = applyCore(inputs, base, block.recovery);
          const postWith = applyCore(inputs, withTreatment, block.recovery);
          const pathBase = projectPath(inputs, postBase, block);
          const pathWith = projectPath(inputs, postWith, block);

          for (let t = 0; t < 3; t++) {
            const ebitBase = pathBase.ebit[t] as number;
            const ebitWith = pathWith.ebit[t] as number;
            // The swap changes neither R' nor E', so EBIT_t is identical.
            expect(ebitWith).toBe(ebitBase);

            const icrBase = pathBase.icr[t] as number;
            const icrWith = pathWith.icr[t] as number;

            // Part 1: exact comparison, no tolerance.
            if (ebitBase >= 0) expect(icrWith >= icrBase).toBe(true);

            // Part 2: Covered_Year = ICR_t >= 1 or debt-free (Infinity), any sign of EBIT_t.
            if (icrBase >= 1) expect(icrWith >= 1).toBe(true);
          }
        },
      ),
      { numRuns: 300 },
    );
    // Refinance must be exercised in a large share of the 300 cases.
    expect(withRefinance).toBeGreaterThan(100);
  });
});
