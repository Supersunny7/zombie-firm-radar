import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { FirmYear } from '../types/data';
import { diagnose } from './diagnose';
import { arbDelta, arbMacroValid, arbValidFirm } from './test/engineArbitraries';
import { geq } from './test/geq';

const REL = 1e-12;

/** Equal within relative tolerance, checked with geq in both directions. */
const close = (a: number, b: number): boolean => geq(a, b, REL) && geq(b, a, REL);

function latest(years: readonly FirmYear[]): FirmYear {
  return years.reduce((a, y) => (y.fy > a.fy ? y : a));
}

describe('diagnose formulas (property)', () => {
  // Feature: rescue-engine, Property 9: Diagnosis formulas
  // **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 14.2**
  it('matches the reference formulas computed from the latest year', () => {
    fc.assert(
      fc.property(arbValidFirm, arbDelta, arbMacroValid, (firm, delta, macro) => {
        const res = diagnose(firm, delta, macro);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const d = res.value;

        const y = latest(firm.years);
        const E = y.ebit_usd as number;
        const I = y.interest_expense_usd as number;
        const D = y.total_debt_usd as number;
        const r = I / D;

        // Reference formulas, written independently of icr().
        const shockedIcr = E / (D * (r + delta));
        expect(close(d.shockedIcr, shockedIcr)).toBe(true);
        expect(close(d.neededRate, E / D)).toBe(true);

        if (E > 0) {
          const needEbit = (D * (r + delta)) / E - 1;
          const needDebt = 1 - E / ((r + delta) * D);
          expect(d.neededEbitIncrease).not.toBeNull();
          expect(d.neededDebtCut).not.toBeNull();
          expect(close(d.neededEbitIncrease as number, needEbit)).toBe(true);
          expect(close(d.neededDebtCut as number, needDebt)).toBe(true);
        } else {
          expect(d.neededEbitIncrease).toBeNull();
          expect(d.neededDebtCut).toBeNull();
        }

        // belowCoverage rule: null or > 0 is below coverage; <= 0 is covered.
        const x = d.neededEbitIncrease;
        expect(d.belowCoverage).toBe(x === null || x > 0);
      }),
      { numRuns: 200 },
    );
  });
});
