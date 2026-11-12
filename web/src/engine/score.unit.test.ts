import { describe, expect, it } from 'vitest';
import { liquidationRecovery } from './liquidation';
import { score } from './score';

describe('score', () => {
  it('matches a hand-computed case', () => {
    // 0.8 * (1 - (30 + 60 + 90) / 300) * 100 = 0.8 * 0.4 * 100 = 32
    const s = score({
      rescued: true,
      survivalOdds: 0.8,
      pain: { workers: 30, shareholders: 60, creditors: 90 },
    });
    expect(s).toBeCloseTo(32, 10);
  });

  it('is 0 when not rescued', () => {
    const s = score({
      rescued: false,
      survivalOdds: 1,
      pain: { workers: 0, shareholders: 0, creditors: 0 },
    });
    expect(s).toBe(0);
  });

  it('clamps out-of-range odds and pain', () => {
    const high = score({
      rescued: true,
      survivalOdds: 1.7,
      pain: { workers: -20, shareholders: -5, creditors: 0 },
    });
    expect(high).toBeCloseTo(100, 10);

    const low = score({
      rescued: true,
      survivalOdds: -0.4,
      pain: { workers: 0, shareholders: 0, creditors: 0 },
    });
    expect(low).toBe(0);

    // Pain above 100 is capped at 100 each: 1 * (1 - 300 / 300) * 100 = 0
    const maxPain = score({
      rescued: true,
      survivalOdds: 1,
      pain: { workers: 250, shareholders: 900, creditors: 101 },
    });
    expect(maxPain).toBeCloseTo(0, 10);
  });
});

describe('liquidationRecovery', () => {
  it('gives recovery 1 and 100 cents when D = 0', () => {
    expect(liquidationRecovery(1e9, 0)).toEqual({ recovery: 1, centsOnDollar: 100 });
  });

  it('computes the Ashgrove case 0.5 * 1.6e9 / 1.05e9', () => {
    const r = liquidationRecovery(1.6e9, 1.05e9);
    expect(r.recovery).toBeCloseTo((0.5 * 1.6e9) / 1.05e9, 12);
    expect(r.centsOnDollar).toBe(76);
  });

  it('caps recovery at 1', () => {
    expect(liquidationRecovery(10, 1)).toEqual({ recovery: 1, centsOnDollar: 100 });
  });

  it('rounds a value stored just below .5 down (0.285 -> 28)', () => {
    // Verified in this JS engine: 0.285 * 100 = 28.499999999999996.
    expect(0.285 * 100).toBeLessThan(28.5);
    expect(Math.round(0.285 * 100)).toBe(28);
    // 0.5 * 0.57 / 1 is exactly the double 0.285.
    const r = liquidationRecovery(0.57, 1);
    expect(r.recovery).toBe(0.285);
    expect(r.centsOnDollar).toBe(28);
  });
});
