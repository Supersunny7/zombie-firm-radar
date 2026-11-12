// Feature: app-shell, Property 8: ICR formatting
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatIcr } from './format';

const RUNS = 200;

describe('Property 8: ICR formatting', () => {
  it('finite values give two decimals, no -0.00, and parse within rounding tolerance', () => {
    // **Validates: Requirements 12.6**
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (v) => {
        const s = formatIcr(v);
        expect(s).toMatch(/^-?\d+\.\d{2}$/);
        expect(s).not.toBe('-0.00');
        expect(Math.abs(Number(s) - v)).toBeLessThanOrEqual(
          0.005 + 4 * Number.EPSILON * Math.abs(v),
        );
      }),
      { numRuns: RUNS },
    );
  });

  it('keeps the sign of clearly negative values', () => {
    // **Validates: Requirements 12.6**
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: -0.005, noNaN: true }), (v) => {
        expect(formatIcr(v).startsWith('-')).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it('never prints -0.00 for tiny negatives and zero', () => {
    // **Validates: Requirements 12.6**
    fc.assert(
      fc.property(fc.double({ min: -0.0049, max: 0, noNaN: true }), (v) => {
        expect(formatIcr(v)).toBe('0.00');
      }),
      { numRuns: RUNS },
    );
    expect(formatIcr(-0)).toBe('0.00');
  });

  it('returns n/a for null and non-finite values', () => {
    // **Validates: Requirements 12.6**
    expect(formatIcr(null)).toBe('n/a');
    for (const v of [NaN, Infinity, -Infinity]) expect(formatIcr(v)).toBe('n/a');
  });
});
