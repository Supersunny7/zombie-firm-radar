import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Firm } from '../types/data';
import { applyTreatment } from './apply';
import { icr } from './icr';
import type { ToolChoice, Treatment } from './types';
import { arbDelta, arbMacroValid, arbTreatment, arbValidFirm } from './test/engineArbitraries';

// Feature: rescue-engine, Property 16: Refinance never raises annual interest cost (RR-7, amended)
// **Validates: Requirements 7.5, 7.6, 7.7, 7.8, 13.8**

const REFINANCE: ToolChoice = { name: 'refinance', params: {} };

/** Adds refinance when absent, dropping another tool if the treatment already has 3. */
function withRefinance(t: Treatment): Treatment {
  if (t.some((x) => x.name === 'refinance')) return t;
  const others = t.length >= 3 ? t.slice(1) : t;
  return [...others, REFINANCE];
}

const arbRefiTreatment: fc.Arbitrary<Treatment> = arbTreatment.map(withRefinance);

/** Firm whose latest-year assets dwarf its debt, so selling 30% clears all debt. */
const arbDebtClearingCase = fc
  .tuple(arbValidFirm, arbMacroValid, arbDelta, arbRefiTreatment)
  .map(([firm, macro, delta, t]) => {
    const latestFy = Math.max(...firm.years.map((y) => y.fy));
    const years = firm.years.map((y) =>
      y.fy === latestFy ? { ...y, total_assets_usd: (y.total_debt_usd as number) * 100 } : y,
    );
    const rest = t.filter((x) => x.name !== 'sell_assets' && x.name !== 'refinance').slice(0, 1);
    const treatment: Treatment = [...rest, { name: 'sell_assets', params: { s: 0.3 } }, REFINANCE];
    return { firm: { ...firm, years } as Firm, macro, delta, treatment };
  });

const arbGeneralCase = fc
  .tuple(arbValidFirm, arbMacroValid, arbDelta, arbRefiTreatment)
  .map(([firm, macro, delta, treatment]) => ({ firm, macro, delta, treatment }));

const arbCase = fc.oneof(
  { weight: 3, arbitrary: arbGeneralCase },
  { weight: 1, arbitrary: arbDebtClearingCase },
);

/** Independent spread tiers (RR-7). */
function spread(x: number): number {
  if (x < 1) return 0.09;
  if (x < 1.5) return 0.06;
  if (x < 3) return 0.035;
  return 0.02;
}

function check(c: {
  firm: Firm;
  macro: Parameters<typeof applyTreatment>[3];
  delta: number;
  treatment: Treatment;
}): boolean {
  const res = applyTreatment(c.firm, c.treatment, c.delta, c.macro);
  expect(res.ok).toBe(true);
  if (!res.ok) return false;
  const post = res.value;

  const latest = c.firm.years.reduce((a, y) => (y.fy > a.fy ? y : a));
  const I = latest.interest_expense_usd as number;
  const D = latest.total_debt_usd as number;
  const oldRate = I / D + c.delta;
  const b = c.macro.dgs10.value;
  const pre = post.debtPreFee;

  expect(post.refinance.requested).toBe(true);

  if (pre === 0) {
    expect(post.refinance.applied).toBe(false);
    expect(post.refinance.note).toBe('No debt remains to refinance.');
    expect(post.debt).toBe(0);
    expect(post.interest).toBe(0);
    expect(post.effRate).toBe(oldRate);
    expect(post.rate).toBe(oldRate);
    return true;
  }

  const icrPre = icr(post.ebit, pre * oldRate) as number;
  const newRate = b + c.delta + spread(icrPre);
  const applied = 1.02 * newRate < oldRate;

  expect(post.refinance.applied).toBe(applied);
  if (applied) {
    expect(post.rate).toBe(newRate);
    expect(post.effRate).toBe(1.02 * newRate);
    expect(post.debt).toBe(pre * 1.02);
  } else {
    expect(post.rate).toBe(oldRate);
    expect(post.effRate).toBe(oldRate);
    expect(post.debt).toBe(pre);
  }
  expect(post.interest).toBe(pre * post.effRate);
  expect(post.interest).toBeLessThanOrEqual(pre * oldRate);
  return true;
}

describe('Property 16: Refinance never raises annual interest cost (RR-7, amended)', () => {
  it('follows the applied/not-applied rules and never raises interest', () => {
    fc.assert(fc.property(arbCase, check), { numRuns: 200 });
  });

  it("reaches D'pre = 0 and then changes nothing and charges no fee", () => {
    fc.assert(
      fc.property(arbDebtClearingCase, (c) => {
        const res = applyTreatment(c.firm, c.treatment, c.delta, c.macro);
        expect(res.ok).toBe(true);
        if (res.ok) expect(res.value.debtPreFee).toBe(0);
        return check(c);
      }),
      { numRuns: 100 },
    );
  });
});
