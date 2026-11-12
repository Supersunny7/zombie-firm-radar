// Feature: rescue-engine, Property 2: icr is monotone in EBIT
// **Validates: Requirements 1.8**
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { icr } from './icr';

const finite = fc.double({ noNaN: true, noDefaultInfinity: true });
const positiveInterest = fc.double({
  min: Number.MIN_VALUE,
  noNaN: true,
  noDefaultInfinity: true,
});

describe('Property 2: icr is monotone in EBIT', () => {
  it('a <= b with interest > 0 never gives icr(a) > icr(b) (exact comparison)', () => {
    fc.assert(
      fc.property(finite, finite, positiveInterest, (x, y, interest) => {
        const a = Math.min(x, y);
        const b = Math.max(x, y);
        const lo = icr(a, interest);
        const hi = icr(b, interest);
        expect(lo).not.toBeNull();
        expect(hi).not.toBeNull();
        expect((lo as number) <= (hi as number)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
