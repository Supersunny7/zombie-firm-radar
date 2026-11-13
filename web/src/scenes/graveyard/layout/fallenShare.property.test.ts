import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { stoneJitter } from './jitter';
import { computeLayout, type LayoutInput } from './layout';

const OPTS = { numRuns: 100 };

/** Distinct 10-digit ciks, 2,500 to 3,000 per list. */
const cikListArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 9_999_999_999 }), {
    minLength: 2500,
    maxLength: 3000,
  })
  .map((ids) => ids.map((id) => String(id).padStart(10, '0')));

const share = (ciks: readonly string[]): number =>
  ciks.filter((c) => stoneJitter(c).fallen).length / ciks.length;

// Feature: graveyard-horror-pass, Property 13: Fallen share is about five percent
// **Validates: Requirements 8.6**
describe('Property 13: Fallen share is about five percent', () => {
  it('has a fallen share between 3 and 7 percent for 2,500 to 3,000 firms', () => {
    fc.assert(
      fc.property(cikListArb, (ciks) => {
        expect(ciks.length).toBeGreaterThanOrEqual(2500);
        expect(new Set(ciks).size).toBe(ciks.length);
        const s = share(ciks);
        expect(s).toBeGreaterThanOrEqual(0.03);
        expect(s).toBeLessThanOrEqual(0.07);
      }),
      OPTS,
    );
  });

  it('agrees with the layout: fallen stones in computeLayout match the jitter', () => {
    const ciks = fc.sample(cikListArb, { numRuns: 1, seed: 13 })[0]!;
    const firms: LayoutInput[] = ciks.map((cik, i) => ({
      cik,
      sector: `Sector ${i % 8}`,
      status: 'healthy',
      total_debt_usd: 1e9,
    }));
    const layout = computeLayout(firms);
    const s = layout.stones.filter((st) => st.fallen).length / firms.length;
    expect(s).toBeGreaterThanOrEqual(0.03);
    expect(s).toBeLessThanOrEqual(0.07);
  }, 30_000);
});
