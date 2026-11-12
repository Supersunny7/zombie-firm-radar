// Feature: graveyard-scene, shock model property tests (Properties 4 to 10)
// **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 13.4, 13.6**
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { icr } from './icr';
import { shockBatch, shockFirm } from './shock';
import type { ShockInput, ShockResult, ShockStatus } from './shock';

const NUM_RUNS = 200;

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbStatus: fc.Arbitrary<ShockStatus> = fc.constantFrom<ShockStatus>(
  'zombie',
  'endangered',
  'healthy',
  'insufficient_data',
);

/** ICR from [-3, 0.99], [1, 1.6], [1.6, 6]; the middle band decides who crosses 1. */
const arbIcr: fc.Arbitrary<number | null> = fc.oneof(
  { weight: 3, arbitrary: fc.double({ min: -3, max: 0.99, noNaN: true }) },
  { weight: 4, arbitrary: fc.double({ min: 1, max: 1.6, noNaN: true }) },
  { weight: 2, arbitrary: fc.double({ min: 1.6, max: 6, noNaN: true }) },
  { weight: 1, arbitrary: fc.constant(null) },
);

/** Ages 0 to 60, weighted around the 10-year threshold. */
const arbAge: fc.Arbitrary<number> = fc.oneof(
  { weight: 6, arbitrary: fc.integer({ min: 9, max: 11 }) },
  { weight: 4, arbitrary: fc.integer({ min: 0, max: 60 }) },
);

/** Debt including zero, negative and null. */
const arbDebt: fc.Arbitrary<number | null> = fc.oneof(
  { weight: 12, arbitrary: fc.integer({ min: 1, max: 100_000_000_000 }) },
  { weight: 1, arbitrary: fc.constant(0) },
  { weight: 1, arbitrary: fc.integer({ min: -1_000_000_000, max: -1 }) },
  { weight: 1, arbitrary: fc.constant(null) },
);

/** implied_rate in [0, 0.2] or null (zero is included on purpose). */
const arbRate: fc.Arbitrary<number | null> = fc.oneof(
  { weight: 12, arbitrary: fc.double({ min: 0, max: 0.2, noNaN: true }) },
  { weight: 1, arbitrary: fc.constant(0) },
  { weight: 1, arbitrary: fc.constant(null) },
);

const arbShockInput: fc.Arbitrary<ShockInput> = fc.record({
  status: arbStatus,
  age_years: arbAge,
  latest_icr: arbIcr,
  total_debt_usd: arbDebt,
  implied_rate: arbRate,
  shock_eligible: fc.oneof(
    { weight: 9, arbitrary: fc.constant(true) },
    { weight: 1, arbitrary: fc.constant(false) },
  ),
});

const arbSliderDelta = fc.integer({ min: 0, max: 20 }).map((k) => k / 400);
const arbValidDelta: fc.Arbitrary<number> = fc.oneof(
  arbSliderDelta,
  fc.double({ min: 0, max: 0.05, noNaN: true }),
);
const arbInvalidDelta: fc.Arbitrary<number> = fc.oneof(
  fc.double({ min: -1e6, max: -Number.MIN_VALUE, noNaN: true }),
  fc.double({ min: 0.05 + 1e-9, max: 1e6, noNaN: true }),
  fc.constantFrom(
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -Number.MIN_VALUE,
    0.05 + 1e-9,
    1,
  ),
);
const arbDelta: fc.Arbitrary<number> = fc.oneof(arbValidDelta, arbInvalidDelta);

const arbFirms = fc.array(arbShockInput, { minLength: 0, maxLength: 40 });

// ---------------------------------------------------------------------------
// Reference helpers (independent restatement of the spec, using shared icr())
// ---------------------------------------------------------------------------

function isEligible(f: ShockInput): boolean {
  const { latest_icr: x, total_debt_usd: d, implied_rate: r } = f;
  if (!f.shock_eligible || x === null || d === null || r === null) return false;
  if (!Number.isFinite(x) || !Number.isFinite(d) || !Number.isFinite(r)) return false;
  return d > 0 && r > 0;
}

/** Expected shocked ICR for an eligible firm at a valid delta. */
function expectedShockedIcr(f: ShockInput, delta: number): number | null {
  const x = f.latest_icr as number;
  const d = f.total_debt_usd as number;
  const r = f.implied_rate as number;
  if (delta === 0) return x;
  const ebit = x * r * d;
  const unsnapped = icr(ebit, d * (r + delta));
  if (unsnapped === null) return null;
  // Mirror the float tolerance: values within 1e-9 of 1 count as exactly 1.
  const raw = Math.abs(unsnapped - 1) <= 1e-9 ? 1 : unsnapped;
  return ebit >= 0 ? Math.min(raw, x) : raw;
}

function unwrap(f: ShockInput, delta: number): ShockResult {
  const res = shockFirm(f, delta);
  if (!res.ok) throw new Error(`unexpected error for delta ${delta}: ${res.error.code}`);
  return res.value;
}

/** healthy better than endangered better than undead; insufficient_data sits with healthy. */
function rank(f: ShockInput, r: ShockResult): number {
  if (r.undead) return 0;
  return f.status === 'endangered' ? 1 : 2;
}

// ---------------------------------------------------------------------------
// Non-vacuity guard
// ---------------------------------------------------------------------------

describe('Non-vacuity guard for arbShockInput', () => {
  it('at least 5% of generated firms are newly undead at +5 pp (1,000 lists)', () => {
    const lists = fc.sample(arbFirms, { numRuns: 1000, seed: 20260101 });
    let total = 0;
    let risen = 0;
    for (const list of lists) {
      for (const f of list) {
        total++;
        if (unwrap(f, 0.05).newlyUndead) risen++;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(risen / total).toBeGreaterThanOrEqual(0.05);
  });
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('shock model properties', () => {
  // Feature: graveyard-scene, Property 4: Invalid delta is a typed error
  it('Property 4: Invalid delta is a typed error', () => {
    fc.assert(
      fc.property(arbShockInput, arbFirms, arbInvalidDelta, (f, list, delta) => {
        const one = shockFirm(f, delta);
        expect(one.ok).toBe(false);
        if (!one.ok) {
          expect(one.error.code).toBe('delta_out_of_range');
          expect('value' in one).toBe(false);
        }
        const batch = shockBatch(list, delta);
        expect(batch.ok).toBe(false);
        if (!batch.ok) expect(batch.error.code).toBe('delta_out_of_range');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Property 4: valid deltas (including 0 and 0.05) are never errors', () => {
    fc.assert(
      fc.property(arbShockInput, arbValidDelta, (f, delta) => {
        expect(shockFirm(f, delta).ok).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
    expect(shockFirm(fc.sample(arbShockInput, 1)[0] as ShockInput, 0.05).ok).toBe(true);
  });

  // Feature: graveyard-scene, Property 5: Shocked ICR comes from the shared icr()
  it('Property 5: Shocked ICR comes from the shared icr()', () => {
    fc.assert(
      fc.property(arbShockInput, arbValidDelta, (f, delta) => {
        const r = unwrap(f, delta);
        if (!isEligible(f)) return;
        const expected = expectedShockedIcr(f, delta);
        if (expected === null) {
          expect(r.shockEligible).toBe(false);
          expect(r.shockedIcr).toBeNull();
        } else {
          expect(r.shockEligible).toBe(true);
          expect(Object.is(r.shockedIcr, expected)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: graveyard-scene, Property 6: Ineligible firms are unchanged
  it('Property 6: Ineligible firms are unchanged', () => {
    fc.assert(
      fc.property(arbShockInput, arbValidDelta, (f, delta) => {
        if (isEligible(f) && expectedShockedIcr(f, delta) !== null) return;
        const r = unwrap(f, delta);
        expect(r.shockEligible).toBe(false);
        expect(r.status).toBe(f.status);
        expect(r.shockedIcr).toBeNull();
        expect(r.newlyUndead).toBe(false);
        expect(r.undead).toBe(f.status === 'zombie');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: graveyard-scene, Property 7: Newly undead matches the rule
  it('Property 7: Newly undead matches the rule', () => {
    fc.assert(
      fc.property(arbShockInput, arbValidDelta, (f, delta) => {
        const r = unwrap(f, delta);
        const expectedIcr = isEligible(f) ? expectedShockedIcr(f, delta) : null;
        const expected =
          expectedIcr !== null &&
          f.status !== 'zombie' &&
          f.age_years >= 10 &&
          (f.latest_icr as number) >= 1 &&
          expectedIcr < 1;
        expect(r.newlyUndead).toBe(expected);
        expect(r.undead).toBe(f.status === 'zombie' || expected);
        expect(r.status).toBe(f.status);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Property 7: shockBatch agrees with shockFirm and with its counters', () => {
    fc.assert(
      fc.property(arbFirms, arbValidDelta, (list, delta) => {
        const b = shockBatch(list, delta);
        expect(b.ok).toBe(true);
        if (!b.ok) return;
        let risen = 0;
        let zombies = 0;
        let notEligible = 0;
        list.forEach((f, i) => {
          const r = unwrap(f, delta);
          expect(b.value.newlyUndead[i]).toBe(r.newlyUndead ? 1 : 0);
          expect(b.value.eligible[i]).toBe(r.shockEligible ? 1 : 0);
          if (r.shockedIcr === null) expect(Number.isNaN(b.value.shockedIcr[i])).toBe(true);
          else expect(b.value.shockedIcr[i]).toBe(r.shockedIcr);
          if (r.newlyUndead) risen++;
          if (f.status === 'zombie') zombies++;
          if (!r.shockEligible) notEligible++;
        });
        expect(b.value.counts).toEqual({ risen, alreadyUndead: zombies, notEligible });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: graveyard-scene, Property 8: Delta zero changes nothing
  it('Property 8: Delta zero changes nothing', () => {
    fc.assert(
      fc.property(arbShockInput, (f) => {
        const r = unwrap(f, 0);
        expect(r.status).toBe(f.status);
        expect(r.newlyUndead).toBe(false);
        expect(r.undead).toBe(f.status === 'zombie');
        if (r.shockEligible) expect(Object.is(r.shockedIcr, f.latest_icr)).toBe(true);
        else expect(r.shockedIcr).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: graveyard-scene, Property 9: A rate rise never raises ICR (non-negative EBIT)
  it('Property 9: A rate rise never raises ICR (non-negative EBIT)', () => {
    fc.assert(
      fc.property(arbShockInput, arbValidDelta, (f, delta) => {
        const r = unwrap(f, delta);
        if (!r.shockEligible) return;
        const x = f.latest_icr as number;
        if (x < 0) return; // EBIT < 0 is excluded by the property
        expect(r.shockedIcr as number).toBeLessThanOrEqual(x);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: graveyard-scene, Property 10: Status never improves and zombies stay undead
  it('Property 10: Status never improves and zombies stay undead', () => {
    fc.assert(
      fc.property(arbShockInput, arbValidDelta, arbValidDelta, (f, d1, d2) => {
        const a = Math.min(d1, d2);
        const b = Math.max(d1, d2);
        const ra = unwrap(f, a);
        const rb = unwrap(f, b);
        expect(rank(f, rb)).toBeLessThanOrEqual(rank(f, ra));
        if (ra.undead) expect(rb.undead).toBe(true);
        if (f.status === 'zombie') {
          expect(ra.undead).toBe(true);
          expect(rb.undead).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Property 10: the undead count never decreases as delta rises', () => {
    fc.assert(
      fc.property(arbFirms, arbValidDelta, arbValidDelta, (list, d1, d2) => {
        const a = Math.min(d1, d2);
        const b = Math.max(d1, d2);
        const count = (delta: number): number => {
          const res = shockBatch(list, delta);
          if (!res.ok) throw new Error('unexpected error');
          return res.value.counts.alreadyUndead + res.value.counts.risen;
        };
        expect(count(b)).toBeGreaterThanOrEqual(count(a));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('arbDelta covers valid and invalid values', () => {
    const sample = fc.sample(arbDelta, { numRuns: 300, seed: 7 });
    expect(sample.some((d) => !(d >= 0 && d <= 0.05))).toBe(true);
    expect(sample.some((d) => d >= 0 && d <= 0.05)).toBe(true);
  });
});
