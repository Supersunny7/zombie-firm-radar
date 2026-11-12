import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { Firm, FirmYear } from '../types/data';
import { belowCoverageFor, diagnose } from './diagnose';

function firmWith(patch: Partial<FirmYear>): Firm {
  const f = structuredClone(ashgroveWorks);
  Object.assign(f.years[f.years.length - 1] as FirmYear, patch);
  return f;
}

describe('diagnose', () => {
  it('computes the Ashgrove diagnosis at delta 0.02', () => {
    const res = diagnose(structuredClone(ashgroveWorks), 0.02, fixtureMacro);
    if (!res.ok) throw new Error('expected ok');
    const d = res.value;
    const interest = 1.05e9 * (61e6 / 1.05e9 + 0.02);
    expect(d.shockedIcr).toBeCloseTo(38e6 / interest, 12);
    expect(d.neededEbitIncrease).toBeCloseTo(interest / 38e6 - 1, 12);
    expect(d.neededDebtCut).toBeCloseTo(1 - 38e6 / interest, 12);
    expect(d.neededRate).toBeCloseTo(38e6 / 1.05e9, 12);
    expect(d.belowCoverage).toBe(true);
  });

  it('E <= 0 gives null increase and cut but still returns shockedIcr and neededRate', () => {
    for (const ebit of [0, -20e6]) {
      const res = diagnose(firmWith({ ebit_usd: ebit }), 0.01, fixtureMacro);
      if (!res.ok) throw new Error('expected ok');
      const d = res.value;
      expect(d.neededEbitIncrease).toBeNull();
      expect(d.neededDebtCut).toBeNull();
      expect(d.shockedIcr).toBeLessThanOrEqual(0);
      expect(d.neededRate).toBeCloseTo(ebit / 1.05e9, 12);
      expect(d.belowCoverage).toBe(true);
    }
  });

  it('already covered firm is not below coverage', () => {
    const res = diagnose(firmWith({ ebit_usd: 500e6 }), 0, fixtureMacro);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.neededEbitIncrease as number).toBeLessThan(0);
    expect(res.value.belowCoverage).toBe(false);
  });

  it('propagates prepare errors', () => {
    const res = diagnose(structuredClone(ashgroveWorks), 0.5, fixtureMacro);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('delta_out_of_range');
  });

  it('D = 0 is not_rescuable', () => {
    const res = diagnose(firmWith({ total_debt_usd: 0 }), 0, fixtureMacro);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('not_rescuable');
  });
});

describe('belowCoverageFor', () => {
  it('0 and -0 mean coverage exactly 1, not below', () => {
    expect(belowCoverageFor(0)).toBe(false);
    expect(belowCoverageFor(-0)).toBe(false);
  });

  it('tiny positive 1e-16 is below coverage', () => {
    expect(belowCoverageFor(1e-16)).toBe(true);
  });

  it('null is below coverage', () => {
    expect(belowCoverageFor(null)).toBe(true);
  });

  it('negative is covered', () => {
    expect(belowCoverageFor(-0.5)).toBe(false);
  });
});
