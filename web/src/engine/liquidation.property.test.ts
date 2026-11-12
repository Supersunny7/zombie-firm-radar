// Feature: rescue-engine, Property 14: Liquidation recovery is bounded (RR-5)
// **Validates: Requirements 11.5, 11.6, 11.8, 13.6**
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { liquidationRecovery } from './liquidation';

// A >= 0, including 0 and very large values.
const assets = fc.oneof(
  fc.constant(0),
  fc.double({ min: 0, max: 1e15, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: 0, max: Number.MAX_VALUE, noNaN: true, noDefaultInfinity: true }),
);

// D > 0, including tiny and very large values.
const debt = fc.oneof(
  fc.double({ min: Number.MIN_VALUE, max: 1e15, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: Number.MIN_VALUE, max: Number.MAX_VALUE, noNaN: true, noDefaultInfinity: true }),
);

describe('Property 14: Liquidation recovery is bounded (RR-5)', () => {
  it('recovery = min(1, 0.5 * A / D) within [0, 1]; centsOnDollar is round(recovery * 100) in [0, 100]', () => {
    fc.assert(
      fc.property(assets, debt, (A, D) => {
        const { recovery, centsOnDollar } = liquidationRecovery(A, D);
        expect(recovery).toBe(Math.min(1, (0.5 * A) / D));
        expect(recovery).toBeGreaterThanOrEqual(0);
        expect(recovery).toBeLessThanOrEqual(1);
        expect(Number.isInteger(centsOnDollar)).toBe(true);
        expect(centsOnDollar).toBeGreaterThanOrEqual(0);
        expect(centsOnDollar).toBeLessThanOrEqual(100);
        expect(centsOnDollar).toBe(Math.round(recovery * 100));
      }),
      { numRuns: 200 },
    );
  });
});
