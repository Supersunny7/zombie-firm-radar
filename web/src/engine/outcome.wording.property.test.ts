import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { drawOutcome } from './outcome';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';

const MESSAGE_RE =
  /^Year [123]: operating margin -?\d+\.\d%, coverage -?\d+\.\d{2}\. .+ stays undead\.$/;
const BANNED_RE = /should|recommend|advise/i;

const clean = (s: string, zero: string): string => (s === `-${zero}` ? zero : s);

describe('outcome consistency and wording', () => {
  // Feature: rescue-engine, Property 21: Outcome consistency and wording
  // **Validates: Requirements 9.2, 9.3, 9.4, 9.8**
  it('rescued iff every year covered; failure message and hint follow the wording rules', () => {
    let rescuedCount = 0;
    let failedCount = 0;

    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        (firm, treatment, delta, macro, seed) => {
          const r = drawOutcome(firm, treatment, delta, macro, seed);
          expect(r.ok).toBe(true);
          if (!r.ok) return;
          const o = r.value;

          const covered = o.years.map((y) => y.coverage.debtFree || (y.coverage.icr ?? NaN) >= 1);
          expect(o.rescued).toBe(covered.every(Boolean));

          if (o.rescued) {
            rescuedCount++;
            expect(o.failingYear).toBeNull();
            expect(o.message).toBeNull();
            expect(o.hint).toBeNull();
            return;
          }
          failedCount++;

          const smallest = covered.findIndex((c) => !c) + 1;
          expect(o.failingYear).toBe(smallest);
          const y = o.years[smallest - 1];
          expect(y).toBeDefined();
          if (!y) return;
          expect(y.t).toBe(smallest);
          expect(y.coverage.debtFree).toBe(false);
          expect(y.coverage.icr).not.toBeNull();

          const msg = o.message;
          expect(msg).not.toBeNull();
          if (msg === null) return;
          expect(msg).toMatch(MESSAGE_RE);

          const margin = clean((y.margin * 100).toFixed(1), '0.0');
          const cov = clean((y.coverage.icr as number).toFixed(2), '0.00');
          expect(msg).toBe(
            `Year ${smallest}: operating margin ${margin}%, coverage ${cov}. ${firm.name} stays undead.`,
          );

          expect(msg).not.toMatch(BANNED_RE);
          if (o.hint !== null) expect(o.hint.text).not.toMatch(BANNED_RE);
        },
      ),
      { numRuns: 300 },
    );

    expect(rescuedCount).toBeGreaterThan(0);
    expect(failedCount).toBeGreaterThan(0);
  });
});
