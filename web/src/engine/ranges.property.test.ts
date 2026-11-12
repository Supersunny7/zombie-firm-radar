import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyTreatment } from './apply';
import { simulate } from './simulate';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';
import type { PostState, ToolChoice, Treatment } from './types';

/** Treatments that tend to drive D' to 0: sell 30% of assets, optionally swap 60%, optionally refinance. */
const arbClearing: fc.Arbitrary<Treatment> = fc
  .record({ swap: fc.boolean(), refi: fc.boolean(), cut: fc.boolean() })
  .map(({ swap, refi, cut }) => {
    const tools: ToolChoice[] = [];
    // At most 3 tools: cut_costs only when swap and refinance are not both present.
    if (cut && !(swap && refi)) tools.push({ name: 'cut_costs', params: { c: 0.04 } });
    tools.push({ name: 'sell_assets', params: { s: 0.3 } });
    if (swap) tools.push({ name: 'debt_for_equity', params: { w: 0.6 } });
    if (refi) tools.push({ name: 'refinance', params: {} });
    return tools;
  });

const arbAnyTreatment: fc.Arbitrary<Treatment> = fc.oneof(
  { weight: 1, arbitrary: arbTreatment },
  { weight: 1, arbitrary: arbClearing },
);

function checkPost(post: PostState): void {
  expect(post.debtPreFee).toBeGreaterThanOrEqual(0);
  expect(post.debt).toBeGreaterThanOrEqual(0);
  expect(post.revenue).toBeGreaterThan(0);
  expect(post.keep).toBeGreaterThanOrEqual(0);
  expect(post.keep).toBeLessThanOrEqual(1);
  for (const p of [post.pain.workers, post.pain.shareholders, post.pain.creditors]) {
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  }
}

describe('ranges: odds, pain and post-state (property)', () => {
  // Feature: rescue-engine, Property 17: Odds, pain and post-state ranges (RR-8)
  // **Validates: Requirements 6.8, 8.11, 13.9, 14.6**
  it('keeps odds in [0, 1], pains in [0, 100] and post-state values in range', () => {
    let debtZero = 0;
    let qNonPositive = 0;
    let eNonPositive = 0;
    fc.assert(
      fc.property(
        arbValidFirm,
        arbMacroValid,
        arbDelta,
        arbAnyTreatment,
        arbSeed,
        fc.integer({ min: 1, max: 200 }),
        (firm, macro, delta, treatment, seed, paths) => {
          const latest = firm.years.reduce((a, y) => (y.fy > a.fy ? y : a));
          if ((latest.equity_usd as number) <= 0) qNonPositive++;
          if ((latest.ebit_usd as number) <= 0) eNonPositive++;

          const applied = applyTreatment(firm, treatment, delta, macro);
          expect(applied.ok).toBe(true);
          if (!applied.ok) return;
          if (applied.value.debtPreFee === 0) debtZero++;
          checkPost(applied.value);

          const sim = simulate(firm, treatment, delta, macro, { paths, seed });
          expect(sim.ok).toBe(true);
          if (!sim.ok) return;
          const r = sim.value;
          expect(r.survivalOdds).toBeGreaterThanOrEqual(0);
          expect(r.survivalOdds).toBeLessThanOrEqual(1);
          expect(r.debtFreeShare).toBeGreaterThanOrEqual(0);
          expect(r.debtFreeShare).toBeLessThanOrEqual(1);
          checkPost(r.post);
        },
      ),
      { numRuns: 200 },
    );
    expect(debtZero).toBeGreaterThan(0);
    expect(qNonPositive).toBeGreaterThan(0);
    expect(eNonPositive).toBeGreaterThan(0);
  });
});
