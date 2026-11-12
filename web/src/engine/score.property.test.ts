// Feature: rescue-engine, Property 24: Score formula and bounds
// **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { score } from './score';

/** Finite values in and out of range, plus NaN. */
const anyNumber = fc.oneof(
  fc.double({ noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: -0.5, max: 1.5, noNaN: true, noDefaultInfinity: true }),
  fc.constant(Number.NaN),
);

const anyPain = fc.oneof(
  fc.double({ noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: -50, max: 150, noNaN: true, noDefaultInfinity: true }),
  fc.constant(Number.NaN),
);

function clampRef(x: number, lo: number, hi: number): number {
  if (Number.isNaN(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

describe('Property 24: Score formula and bounds', () => {
  it('equals the clamped formula, lies in [0, 100], and is 0 when not rescued', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        anyNumber,
        anyPain,
        anyPain,
        anyPain,
        (rescued, odds, workers, shareholders, creditors) => {
          const result = score({
            rescued,
            survivalOdds: odds,
            pain: { workers, shareholders, creditors },
          });

          const sum =
            clampRef(workers, 0, 100) +
            clampRef(shareholders, 0, 100) +
            clampRef(creditors, 0, 100);
          const expected = (rescued ? 1 : 0) * clampRef(odds, 0, 1) * (1 - sum / 300) * 100;

          expect(Number.isNaN(result)).toBe(false);
          expect(result).toBeCloseTo(expected, 9);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
          if (!rescued) expect(result).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});
