// Feature: app-shell, Property 4: Data guards reject any single-field corruption and name its path
// **Validates: Requirements 7.2, 7.3, 7.4**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbCorruption, arbFirm, arbFirmsIndex, arbMacro } from '../test/arbitraries';
import { guardFirm, guardFirmsIndex, guardMacro } from './guards';
import type { GuardResult } from './guards';

/** Reported path is the corrupted path, or lies inside it (a child of the corrupted node). */
function pathMatches(reported: string, corrupted: string): boolean {
  return (
    reported === corrupted ||
    reported.startsWith(`${corrupted}.`) ||
    reported.startsWith(`${corrupted}[`)
  );
}

function checkCorruption<T>(
  arb: fc.Arbitrary<unknown>,
  guard: (v: unknown) => GuardResult<T>,
): void {
  const arbCase = arb.chain((valid) =>
    arbCorruption(valid).map((corruption) => ({ valid, corruption })),
  );
  fc.assert(
    fc.property(arbCase, ({ valid, corruption }) => {
      // Sanity: the uncorrupted value is accepted.
      expect(guard(valid).ok).toBe(true);
      // Pass the corrupted value directly (it may hold NaN or Infinity).
      const result = guard(corruption.value);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          pathMatches(result.path, corruption.path),
          `reported ${result.path}, corrupted ${corruption.path} (${corruption.kind})`,
        ).toBe(true);
      }
    }),
    { numRuns: 200 },
  );
}

describe('Property 4: single-field corruption is rejected with its path', () => {
  it('guardFirmsIndex', () => {
    checkCorruption(arbFirmsIndex, guardFirmsIndex);
  });
  it('guardFirm', () => {
    checkCorruption(arbFirm, guardFirm);
  });
  it('guardMacro', () => {
    checkCorruption(arbMacro, guardMacro);
  });
});
