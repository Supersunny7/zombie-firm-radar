import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { Firm, FirmYear } from '../types/data';
import { applyTreatment } from './apply';
import { diagnose } from './diagnose';
import { refinanceApplies } from './refinance';
import type { PostState, Treatment } from './types';

const DELTA = 0.01;
const REL = 1e-9;

/** Relative-tolerance comparison; the message shows expected and actual. */
function expectRel(label: string, actual: number, expected: number, rel = REL): void {
  const scale = Math.max(Math.abs(expected), Number.MIN_VALUE);
  const diff = Math.abs(actual - expected);
  expect(diff <= rel * scale, `${label}: expected ${expected}, actual ${actual}`).toBe(true);
}

function expectNear(label: string, actual: number, expected: number, abs: number): void {
  expect(
    Math.abs(actual - expected) <= abs,
    `${label}: expected ${expected} (+/- ${abs}), actual ${actual}`,
  ).toBe(true);
}

function applyOk(firm: Firm, treatment: Treatment): PostState {
  const res = applyTreatment(firm, treatment, DELTA, fixtureMacro);
  if (!res.ok) throw new Error(`applyTreatment failed: ${res.error.code}`);
  return res.value;
}

const latest = ashgroveWorks.years[ashgroveWorks.years.length - 1] as FirmYear;

/** Ashgrove_Variant: interest expense 120e6, everything else unchanged. */
const variant: Firm = structuredClone(ashgroveWorks);
(variant.years[variant.years.length - 1] as FirmYear).interest_expense_usd = 120e6;

describe('Ashgrove worked example', () => {
  it('fixture sanity: dgs10 is 0.042 and latest year matches the worked example', () => {
    expect(fixtureMacro.dgs10.value).toBe(0.042);
    expect(latest.revenue_usd).toBe(1.2e9);
    expect(latest.ebit_usd).toBe(38e6);
    expect(latest.interest_expense_usd).toBe(61e6);
    expect(latest.total_debt_usd).toBe(1.05e9);
    expect(latest.total_assets_usd).toBe(1.6e9);
    expect(latest.equity_usd).toBe(140e6);
  });

  it('diagnosis at delta 0.01', () => {
    const res = diagnose(structuredClone(ashgroveWorks), DELTA, fixtureMacro);
    if (!res.ok) throw new Error('expected ok');
    const d = res.value;
    expectNear('shockedIcr', d.shockedIcr, 0.5315, 0.005);
    expectNear('neededEbitIncrease', d.neededEbitIncrease as number, 0.882, 0.005);
    expectNear('neededDebtCut', d.neededDebtCut as number, 0.469, 0.005);
    expectNear('neededRate', d.neededRate, 0.0362, 0.0005);
    const interest = 1.05e9 * (61e6 / 1.05e9 + DELTA);
    expectRel('shockedIcr exact', d.shockedIcr, 38e6 / interest);
  });

  it('empty treatment leaves R, E, D unchanged and pains at 0', () => {
    const s = applyOk(ashgroveWorks, []);
    expect(s.revenue).toBe(1.2e9);
    expect(s.ebit).toBe(38e6);
    expect(s.debtPreFee).toBe(1.05e9);
    expect(s.debt).toBe(1.05e9);
    expect(s.pain).toEqual({ workers: 0, shareholders: 0, creditors: 0 });
  });

  it('cut_costs c = 0.05', () => {
    const s = applyOk(ashgroveWorks, [{ name: 'cut_costs', params: { c: 0.05 } }]);
    expectRel("E'", s.ebit, 38e6 + 0.05 * (1.2e9 - 38e6));
    expectRel("R'", s.revenue, 1.2e9);
    expectRel("D'", s.debtPreFee, 1.05e9);
    expectRel('workers', s.pain.workers, 31.25);
  });

  it('sell_assets s = 0.2', () => {
    const s = applyOk(ashgroveWorks, [{ name: 'sell_assets', params: { s: 0.2 } }]);
    expectRel("D'", s.debtPreFee, 1.05e9 - 0.2 * 1.6e9 * 0.7);
    expectRel("R'", s.revenue, 1.2e9 * 0.8);
    expectRel("E'", s.ebit, 38e6 * 0.8);
    expectRel('workers', s.pain.workers, (0.2 / 0.3) * 35);
  });

  it('debt_for_equity w = 0.3', () => {
    const s = applyOk(ashgroveWorks, [{ name: 'debt_for_equity', params: { w: 0.3 } }]);
    expectRel("D'", s.debtPreFee, 1.05e9 - 0.3 * 1.05e9);
    expectRel('keep', s.keep, 140 / 455);
    expectRel('shareholders', s.pain.shareholders, (1 - 140 / 455) * 100);
    expectRel('creditors', s.pain.creditors, 18);
  });

  it('refinance alone does not apply on real Ashgrove', () => {
    // Refinance can never apply to Ashgrove: 1.02 * b + 1.02 * spread + 0.02 * delta >= 0.06324
    // (spread >= 0.02), which exceeds r = 61/1050 = 0.05810 for every delta >= 0.
    const s = applyOk(ashgroveWorks, [{ name: 'refinance', params: {} }]);
    const oldRate = 61e6 / 1.05e9 + DELTA;
    expect(s.refinance.requested).toBe(true);
    expect(s.refinance.applied).toBe(false);
    expectRel('icrPre', s.refinance.icrPre as number, 38e6 / (1.05e9 * oldRate));
    expectNear('icrPre approx', s.refinance.icrPre as number, 0.5315, 0.005);
    expect(s.refinance.spread).toBe(0.09);
    expectRel('newRate', s.refinance.newRate as number, 0.042 + DELTA + 0.09);
    expectNear('newRate approx', s.refinance.newRate as number, 0.142, 1e-12);
    expect(1.02 * 0.142 >= 0.0680952381).toBe(true);
    expectRel('rate unchanged', s.rate, oldRate);
    expectRel('displayed debt equals D pre fee', s.debt, s.debtPreFee);
    expectRel('debt', s.debt, 1.05e9);
  });

  describe('Ashgrove_Variant (interest 120e6)', () => {
    const treatment: Treatment = [
      { name: 'cut_costs', params: { c: 0.08 } },
      { name: 'debt_for_equity', params: { w: 0.6 } },
      { name: 'refinance', params: {} },
    ];

    it('refinance applies after cut 0.08 + swap 0.6', () => {
      const s = applyOk(variant, treatment);
      const oldRate = 120 / 1050 + 0.01;
      expectRel('icr_pre', s.refinance.icrPre as number, 130.96e6 / (420e6 * oldRate));
      expect(s.refinance.applied).toBe(true);
      expect(s.refinance.spread).toBe(0.035);
      expectRel('newRate', s.refinance.newRate as number, 0.042 + 0.01 + 0.035);
      expectNear('newRate approx', s.refinance.newRate as number, 0.087, 1e-12);
      expect(1.02 * 0.087 < 120 / 1050 + 0.01).toBe(true);
      expectRel('displayed debt', s.debt, 420e6 * 1.02);
      expectRel('displayed rate', s.rate, 0.042 + 0.01 + 0.035);
      expectRel('interest', s.interest, 420e6 * (1.02 * 0.087));
      expectRel('year-0 ICR', s.year0.icr as number, 130.96e6 / (420e6 * (1.02 * 0.087)));
      expectRel('keep', s.keep, 140 / 770);
      expectRel('workers', s.pain.workers, 50);
      expectRel('shareholders', s.pain.shareholders, (1 - 140 / 770) * 100);
      expectRel('creditors', s.pain.creditors, 36);
    });

    it('refinance alone does not apply on the variant', () => {
      const s = applyOk(variant, [{ name: 'refinance', params: {} }]);
      expect(s.refinance.applied).toBe(false);
      expectRel('rate unchanged', s.rate, 120 / 1050 + 0.01);
      expectRel('displayed debt equals D pre fee', s.debt, s.debtPreFee);
    });
  });

  describe('independent hand-computed literals (relative 1e-6, Req 15.3)', () => {
    const LIT = 1e-6;

    it('diagnosis at delta 0.01', () => {
      const res = diagnose(structuredClone(ashgroveWorks), DELTA, fixtureMacro);
      if (!res.ok) throw new Error('expected ok');
      const d = res.value;
      // shocked interest = 1.05e9 * (61/1050 + 0.01) = 71.5e6, so E / interest = 38 / 71.5
      expectRel('shocked interest', 38e6 / d.shockedIcr, 71.5e6, LIT);
      expectRel('shockedIcr', d.shockedIcr, 0.5314685, LIT);
      expectRel('neededEbitIncrease', d.neededEbitIncrease as number, 0.881579, LIT);
      expectRel('neededDebtCut', d.neededDebtCut as number, 0.4685315, LIT);
      expectRel('neededRate', d.neededRate, 0.036190476, LIT);
    });

    it('cut_costs 0.05', () => {
      const s = applyOk(ashgroveWorks, [{ name: 'cut_costs', params: { c: 0.05 } }]);
      expectRel("E'", s.ebit, 96.1e6, LIT);
      expectRel('workers', s.pain.workers, 31.25, LIT);
    });

    it('sell_assets 0.2', () => {
      const s = applyOk(ashgroveWorks, [{ name: 'sell_assets', params: { s: 0.2 } }]);
      expectRel("D'", s.debtPreFee, 826e6, LIT);
      expectRel("R'", s.revenue, 960e6, LIT);
      expectRel("E'", s.ebit, 30.4e6, LIT);
      expectRel('workers', s.pain.workers, 23.33333, LIT);
    });

    it('debt_for_equity 0.3', () => {
      const s = applyOk(ashgroveWorks, [{ name: 'debt_for_equity', params: { w: 0.3 } }]);
      expectRel("D'", s.debtPreFee, 735e6, LIT);
      expectRel('keep', s.keep, 0.3076923, LIT);
      expectRel('shareholders', s.pain.shareholders, 69.2308, LIT);
      expectRel('creditors', s.pain.creditors, 18, LIT);
    });

    it('variant: cut 0.08 + swap 0.6 + refinance', () => {
      const s = applyOk(variant, [
        { name: 'cut_costs', params: { c: 0.08 } },
        { name: 'debt_for_equity', params: { w: 0.6 } },
        { name: 'refinance', params: {} },
      ]);
      expectRel('icr_pre', s.refinance.icrPre as number, 2.508812, LIT);
      expectRel('newRate', s.refinance.newRate as number, 0.087, LIT);
      expectRel('displayed debt', s.debt, 428.4e6, LIT);
      expectRel('interest', s.interest, 37.2708e6, LIT);
      expectRel('year-0 ICR', s.year0.icr as number, 3.5137427, LIT);
      expectRel('keep', s.keep, 0.1818182, LIT);
      expectRel('shareholders', s.pain.shareholders, 81.8182, LIT);
      expectRel('creditors', s.pain.creditors, 36, LIT);
      expectRel('workers', s.pain.workers, 50, LIT);
    });
  });

  it('exact boundary: refinanceApplies(1.02 * x, x) is false', () => {
    for (const x of [0.087, 0.142, 0.02, 0.05, 0.0625, 0.1, 0.123456789]) {
      expect(refinanceApplies(1.02 * x, x), `x = ${x}`).toBe(false);
    }
  });
});
