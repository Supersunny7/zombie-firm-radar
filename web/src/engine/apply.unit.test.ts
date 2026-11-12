import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { Firm, FirmYear } from '../types/data';
import { applyTreatment } from './apply';
import { spreadFor } from './refinance';
import type { PostState, Treatment } from './types';

const DELTA = 0.02;

function firmWith(patch: Partial<FirmYear>): Firm {
  const f = structuredClone(ashgroveWorks);
  const last = f.years[f.years.length - 1] as FirmYear;
  Object.assign(last, patch);
  return f;
}

function applied(firm: Firm, treatment: Treatment, delta = DELTA): PostState {
  const res = applyTreatment(firm, treatment, delta, structuredClone(fixtureMacro));
  if (!res.ok) throw new Error(`expected ok, got ${res.error.code}`);
  return res.value;
}

/** Small debt so that a 30% asset sale (0.3 * 1.6e9 * 0.7 = 336e6) repays everything. */
const smallDebtFirm = (): Firm => firmWith({ total_debt_usd: 100e6, interest_expense_usd: 5e6 });

describe('spreadFor tiers', () => {
  it.each([
    [-1, 0.09],
    [0.999, 0.09],
    [1, 0.06],
    [1.499, 0.06],
    [1.5, 0.035],
    [2.999, 0.035],
    [3, 0.02],
  ] as const)('icr_pre = %s gives spread %s', (icrPre, spread) => {
    expect(spreadFor(icrPre)).toBe(spread);
  });
});

describe('refinance with no debt left', () => {
  const sell = { name: 'sell_assets', params: { s: 0.3 } } as const;
  const refi = { name: 'refinance', params: {} } as const;

  it('notes that nothing remains, charges no fee and leaves the state unchanged', () => {
    const without = applied(smallDebtFirm(), [sell]);
    const withRefi = applied(smallDebtFirm(), [sell, refi]);

    expect(withRefi.refinance.requested).toBe(true);
    expect(withRefi.refinance.applied).toBe(false);
    expect(withRefi.refinance.note).toBe('No debt remains to refinance.');
    expect(withRefi.debtPreFee).toBe(0);
    expect(withRefi.debt).toBe(0);

    expect({ ...withRefi, refinance: without.refinance }).toEqual(without);
  });
});

describe('sale proceeds above debt', () => {
  it('floors debt at 0 and shows debt-free without Infinity or NaN', () => {
    const post = applied(smallDebtFirm(), [{ name: 'sell_assets', params: { s: 0.3 } }]);
    expect(post.debtPreFee).toBe(0);
    expect(post.debtFree).toBe(true);
    expect(post.coverageText).toBe('debt-free');
    expect(post.year0).toEqual({ icr: null, debtFree: true });

    for (const v of [
      post.revenue,
      post.ebit,
      post.debtPreFee,
      post.debt,
      post.rate,
      post.effRate,
      post.interest,
      post.keep,
      post.pain.workers,
      post.pain.shareholders,
      post.pain.creditors,
    ]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(post.coverageText).not.toMatch(/Infinity|NaN/);
  });
});

describe('debt-for-equity with non-positive equity', () => {
  it.each([-5e6, 0])('Q = %s: keep is 0 when converted > 0', (q) => {
    const post = applied(firmWith({ equity_usd: q }), [
      { name: 'debt_for_equity', params: { w: 0.3 } },
    ]);
    expect(post.keep).toBe(0);
    expect(post.pain.shareholders).toBe(100);
    expect(post.pain.creditors).toBeCloseTo(18, 10);
  });

  it.each([-5e6, 0])('Q = %s: keep is 1 and shareholders pain 0 when converted = 0', (q) => {
    const post = applied(firmWith({ equity_usd: q }), [
      { name: 'debt_for_equity', params: { w: 0 } },
    ]);
    expect(post.keep).toBe(1);
    expect(post.pain.shareholders).toBe(0);
    expect(Number.isNaN(post.keep)).toBe(false);
  });
});

describe('sell_assets after cut_costs', () => {
  it('s = 0.30 scales revenue and the post-cut EBIT by 0.7', () => {
    const firm = structuredClone(ashgroveWorks);
    const y = firm.years[firm.years.length - 1] as FirmYear;
    const R = y.revenue_usd as number;
    const E = y.ebit_usd as number;
    const c = 0.04;

    const post = applied(firm, [
      { name: 'cut_costs', params: { c } },
      { name: 'sell_assets', params: { s: 0.3 } },
    ]);

    const ePrev = E + c * (R - E);
    expect(post.revenue).toBeCloseTo(0.7 * R, 3);
    expect(post.ebit).toBeCloseTo(0.7 * ePrev, 3);
  });
});

describe('click order', () => {
  it('a reversed treatment gives deeply equal PostState and Refinance_Note', () => {
    const treatment: Treatment = [
      { name: 'cut_costs', params: { c: 0.03 } },
      { name: 'sell_assets', params: { s: 0.1 } },
      { name: 'refinance', params: {} },
    ];
    const forward = applied(structuredClone(ashgroveWorks), treatment);
    const backward = applied(structuredClone(ashgroveWorks), [...treatment].reverse());

    expect(backward).toEqual(forward);
    expect(backward.refinance.note).toBe(forward.refinance.note);
    expect(forward.refinance.note).not.toBeNull();
  });
});
