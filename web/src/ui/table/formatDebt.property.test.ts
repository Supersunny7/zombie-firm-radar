// Feature: app-shell, Property 9: Debt formatting picks the unit by magnitude
// Validates: Requirements 12.7
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatDebt } from './format';

const SIZES: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/** Magnitudes spread from 0 up to beyond 1e15, plus values right at unit boundaries. */
const magnitude = fc.oneof(
  fc
    .tuple(fc.integer({ min: 0, max: 17 }), fc.double({ min: 0, max: 10, noNaN: true }))
    .map(([e, m]) => m * 10 ** e),
  fc
    .tuple(fc.constantFrom(1e3, 1e6, 1e9, 1e12), fc.integer({ min: -100, max: 100 }))
    .map(([u, d]) => Math.max(0, u + d * (u / 1e5))),
  fc.integer({ min: 0, max: 2000 }),
);

describe('Property 9: Debt formatting picks the unit by magnitude', () => {
  it('chooses the unit after rounding, keeps sign, and stays within rounding tolerance', () => {
    fc.assert(
      fc.property(magnitude, fc.boolean(), (abs, negative) => {
        const v = negative ? -abs : abs;
        const out = formatDebt(v);
        const m = /^(-?)\$(\d+(?:\.\d)?)([KMBT]?)$/.exec(out);
        expect(m, out).not.toBeNull();
        const sign = m?.[1] ?? '';
        const num = m?.[2] ?? '';
        const suffix = m?.[3] ?? '';
        const n = Number(num);

        if (suffix === '') {
          // whole dollars, no decimal point
          expect(num).toMatch(/^\d+$/);
          expect(n).toBeLessThan(1000);
          expect(Math.abs(n - abs)).toBeLessThanOrEqual(0.5 + 1e-9);
        } else {
          const unit = SIZES[suffix] as number;
          expect(num).toMatch(/^\d+\.\d$/);
          if (suffix !== 'T') expect(n).toBeLessThan(1000); // no `1000.0K`
          expect(n).toBeGreaterThanOrEqual(1);
          const shown = n * unit;
          // unit is the largest one not exceeding the displayed value
          expect(shown).toBeGreaterThanOrEqual(unit * (1 - 1e-12));
          const larger = Object.values(SIZES).filter((s) => s > unit);
          for (const s of larger) expect(shown).toBeLessThan(s * (1 + 1e-12));
          // within half a displayed step (0.1 unit) of the input
          expect(Math.abs(shown - abs)).toBeLessThanOrEqual(0.05 * unit * (1 + 1e-9) + 1e-6);
        }

        // sign: leading "-" only for negatives that do not display as $0
        if (negative && out !== '$0') expect(sign).toBe('-');
        else expect(sign).toBe('');
      }),
      { numRuns: 300 },
    );
  });

  it('returns n/a for null and non-finite input', () => {
    expect(formatDebt(null)).toBe('n/a');
    expect(formatDebt(Number.NaN)).toBe('n/a');
  });

  it('rolls over at unit boundaries instead of overflowing', () => {
    expect(formatDebt(999_950)).toBe('$1.0M');
    expect(formatDebt(999.6)).toBe('$1.0K');
    expect(formatDebt(-1_500_000_000)).toBe('-$1.5B');
  });
});
