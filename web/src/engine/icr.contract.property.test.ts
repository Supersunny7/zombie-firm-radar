// Feature: rescue-engine, Property 1: icr contract
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { icr } from './icr';

const arbValue = fc.oneof(
  fc.double({ noNaN: true, noDefaultInfinity: true }),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  fc.constantFrom(null, undefined, Number.NaN, Infinity, -Infinity, 0, -0),
);

// Independent oracle written from the requirements, not from the implementation.
function expected(ebit: unknown, interest: unknown): number | null {
  const ebitOk = typeof ebit === 'number' && !Number.isNaN(ebit);
  const interestOk = typeof interest === 'number' && Number.isFinite(interest) && interest > 0;
  if (!ebitOk || !interestOk) return null;
  return (ebit as number) / (interest as number);
}

describe('Property 1: icr contract', () => {
  it('matches the contract for any ebit/interest, never throws', () => {
    fc.assert(
      fc.property(arbValue, arbValue, (ebit, interest) => {
        let result: number | null = null;
        expect(() => {
          result = icr(ebit, interest);
        }).not.toThrow();
        expect(Object.is(result, expected(ebit, interest))).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('returns ebit / interest for finite ebit and positive finite interest; negative ebit gives a negative result', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e12, max: 1e12 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 1e-6, max: 1e12 }),
        (ebit, interest) => {
          const result = icr(ebit, interest);
          expect(Object.is(result, ebit / interest)).toBe(true);
          // Req 1.4 (IEEE): counterexample [-5e-324, 2] underflows to -0, so accept < 0 or -0.
          if (ebit < 0 && result !== null) {
            expect(result < 0 || Object.is(result, -0)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
