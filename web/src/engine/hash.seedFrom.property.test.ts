import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fnv1a32, seedFrom } from './hash';
import { parseTreatment, serialiseTreatment } from './treatment';
import type { Treatment } from './types';
import {
  arbBadCik,
  arbBadDate,
  arbBadTreatment,
  arbCik,
  arbIsoDate,
  arbTreatment,
} from './test/engineArbitraries';

const NUM_RUNS = 200;

// Feature: rescue-engine, Property 23: seedFrom output and date validation
// **Validates: Requirements 10.1, 10.2, 10.4, 10.5, 10.9**
describe('Property 23: seedFrom output and date validation', () => {
  it('valid inputs give fnv1a32(cik|serialised treatment|date) in [0, 4294967295]', () => {
    fc.assert(
      fc.property(arbCik, arbTreatment, arbIsoDate, (cik, t, date) => {
        const r = seedFrom(cik, t, date);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const parsed = parseTreatment(t);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(r.value).toBe(fnv1a32(`${cik}|${serialiseTreatment(parsed.value)}|${date}`));
        expect(Number.isInteger(r.value)).toBe(true);
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(4294967295);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('a bad date gives invalid_date', () => {
    fc.assert(
      fc.property(arbCik, arbTreatment, arbBadDate, (cik, t, bad) => {
        const r = seedFrom(cik, t, bad.date as string);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe('invalid_date');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('a bad cik gives invalid_cik', () => {
    fc.assert(
      fc.property(arbBadCik, arbTreatment, arbIsoDate, (bad, t, date) => {
        const r = seedFrom(bad.cik as string, t, date);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe('invalid_cik');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('with several defects the error follows the order treatment, cik, isoDate', () => {
    fc.assert(
      fc.property(arbBadTreatment, arbBadCik, arbBadDate, (badT, badC, badD) => {
        const treatment = badT.value as Treatment;
        const expected = parseTreatment(treatment);
        expect(expected.ok).toBe(false);
        if (expected.ok) return;

        // treatment wins over cik and date
        const all = seedFrom(badC.cik as string, treatment, badD.date as string);
        expect(all.ok).toBe(false);
        if (!all.ok) expect(all.error.code).toBe(expected.error.code);

        // treatment wins over a bad cik alone
        const tc = seedFrom(badC.cik as string, treatment, '2024-01-05');
        if (!tc.ok) expect(tc.error.code).toBe(expected.error.code);
        expect(tc.ok).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );

    fc.assert(
      fc.property(arbBadCik, arbTreatment, arbBadDate, (badC, t, badD) => {
        // cik wins over date
        const r = seedFrom(badC.cik as string, t, badD.date as string);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe('invalid_cik');
      }),
      { numRuns: NUM_RUNS },
    );

    fc.assert(
      fc.property(arbBadTreatment, arbCik, arbBadDate, (badT, cik, badD) => {
        // treatment wins over date
        const treatment = badT.value as Treatment;
        const expected = parseTreatment(treatment);
        const r = seedFrom(cik, treatment, badD.date as string);
        expect(r.ok).toBe(false);
        if (!r.ok && !expected.ok) expect(r.error.code).toBe(expected.error.code);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
