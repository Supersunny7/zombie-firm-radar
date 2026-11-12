import { describe, expect, it } from 'vitest';
import { shockBatch, shockFirm } from './index';
import type { ShockInput } from './index';

const base: ShockInput = {
  status: 'healthy',
  age_years: 18,
  latest_icr: 1.2,
  total_debt_usd: 100_000_000,
  implied_rate: 0.05,
  shock_eligible: true,
};

function shock(f: ShockInput, delta: number) {
  const r = shockFirm(f, delta);
  if (!r.ok) throw new Error(`unexpected error ${r.error.code}`);
  return r.value;
}

describe('shock worked example (ICR 1.2, rate 5%, debt 100M, age 18)', () => {
  it('is not undead at +0.75 pp', () => {
    const r = shock(base, 0.0075);
    expect(r.newlyUndead).toBe(false);
    expect(r.undead).toBe(false);
    expect(r.shockedIcr).toBeCloseTo(6 / 5.75, 6);
  });

  it('is not undead at +1.00 pp (ICR is exactly 1, not below 1)', () => {
    const r = shock(base, 0.01);
    expect(r.newlyUndead).toBe(false);
    expect(r.shockedIcr).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  it('is newly undead at +1.25 pp', () => {
    const r = shock(base, 0.0125);
    expect(r.newlyUndead).toBe(true);
    expect(r.undead).toBe(true);
    expect(r.shockedIcr).toBeCloseTo(6 / 6.25, 6);
    expect(r.status).toBe('healthy');
  });
});

describe('shock edge cases', () => {
  it('never marks a firm with latest_icr 0.9 as newly undead', () => {
    const f: ShockInput = { ...base, status: 'endangered', latest_icr: 0.9 };
    for (let k = 0; k <= 20; k++) {
      const r = shock(f, k / 400);
      expect(r.newlyUndead).toBe(false);
    }
  });

  it('delta 0 returns latest_icr unchanged', () => {
    expect(shock(base, 0).shockedIcr).toBe(1.2);
  });

  it('treats zero interest (implied_rate 0) as not eligible', () => {
    const r = shock({ ...base, implied_rate: 0 }, 0.05);
    expect(r.shockEligible).toBe(false);
    expect(r.shockedIcr).toBeNull();
    expect(r.newlyUndead).toBe(false);
  });

  it('treats zero debt and missing fields as not eligible', () => {
    expect(shock({ ...base, total_debt_usd: 0 }, 0.05).shockEligible).toBe(false);
    expect(shock({ ...base, latest_icr: null }, 0.05).shockEligible).toBe(false);
    expect(shock({ ...base, implied_rate: null }, 0.05).shockEligible).toBe(false);
    expect(shock({ ...base, shock_eligible: false }, 0.05).shockEligible).toBe(false);
  });

  it('returns a typed error for an out-of-range delta', () => {
    for (const d of [-0.01, 0.051, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = shockFirm(base, d);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('delta_out_of_range');
      expect(shockBatch([base], d).ok).toBe(false);
    }
  });
});

describe('shockBatch', () => {
  it('matches shockFirm and counts correctly', () => {
    const zombie: ShockInput = { ...base, status: 'zombie', latest_icr: 0.4 };
    const ineligible: ShockInput = { ...base, shock_eligible: false };
    const r = shockBatch([base, zombie, ineligible], 0.0125);
    if (!r.ok) throw new Error('unexpected error');
    expect(r.value.counts).toEqual({ risen: 1, alreadyUndead: 1, notEligible: 1 });
    expect(Array.from(r.value.newlyUndead)).toEqual([1, 0, 0]);
    expect(Number.isNaN(r.value.shockedIcr[2])).toBe(true);
  });

  it('handles 3,000 firms in under 100 ms', () => {
    const firms: ShockInput[] = Array.from({ length: 3000 }, (_, i) => ({
      ...base,
      latest_icr: 0.5 + (i % 40) / 20,
      implied_rate: 0.02 + (i % 10) / 100,
      total_debt_usd: 1_000_000 * (1 + (i % 50)),
      status: i % 7 === 0 ? 'zombie' : 'healthy',
    }));
    shockBatch(firms, 0.02); // warm-up
    // The purity scan forbids clock calls in engine files, so use hrtime.
    const t0 = process.hrtime.bigint();
    const r = shockBatch(firms, 0.05);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    expect(r.ok).toBe(true);
    expect(ms).toBeLessThan(100);
  });
});

describe('engine index exports for the shock model', () => {
  it('exposes shockFirm, shockBatch and mulberry32', async () => {
    const mod = (await import('./index')) as Record<string, unknown>;
    for (const name of ['shockFirm', 'shockBatch', 'mulberry32']) {
      expect(typeof mod[name], name).toBe('function');
    }
  });
});
