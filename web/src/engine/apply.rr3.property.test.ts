import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { FirmYear } from '../types/data';
import { applyTreatment } from './apply';
import { diagnose } from './diagnose';
import { icr } from './icr';
import { arbMacroValid, arbValidFirm } from './test/engineArbitraries';

const REL = 1e-12;

/** Relative equality: |a - b| <= REL * max(|a|, |b|). Exact when both are 0. */
const close = (a: number, b: number): boolean =>
  a === b || Math.abs(a - b) <= REL * Math.max(Math.abs(a), Math.abs(b));

function latest(years: readonly FirmYear[]): FirmYear {
  return years.reduce((a, y) => (y.fy > a.fy ? y : a));
}

describe('RR-3: no treatment and no shock (property)', () => {
  // Feature: rescue-engine, Property 10: No treatment and no shock leave coverage unchanged (RR-3)
  // **Validates: Requirements 5.6, 13.4**
  it('keeps year-0 and shocked coverage equal to icr(E, I)', () => {
    fc.assert(
      fc.property(arbValidFirm, arbMacroValid, (firm, macro) => {
        const y = latest(firm.years);
        const expected = icr(y.ebit_usd, y.interest_expense_usd);
        expect(expected).not.toBeNull();

        const applied = applyTreatment(firm, [], 0, macro);
        expect(applied.ok).toBe(true);
        const diagnosis = diagnose(firm, 0, macro);
        expect(diagnosis.ok).toBe(true);
        if (!applied.ok || !diagnosis.ok) return;

        const year0 = applied.value.year0.icr;
        expect(year0).not.toBeNull();
        expect(close(year0 as number, expected as number)).toBe(true);
        expect(close(diagnosis.value.shockedIcr, expected as number)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
