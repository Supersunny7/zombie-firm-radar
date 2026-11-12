import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyTreatment } from './apply';
import { diagnose } from './diagnose';
import { drawOutcome } from './outcome';
import { simulate } from './simulate';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';
import type { CoverageView, Treatment } from './types';
import type { Firm } from '../types/data';

interface NumberAt {
  readonly path: string;
  readonly value: number;
}

/** Collects every number reachable in plain objects and arrays (strings, booleans, null skipped). */
function collectNumbers(value: unknown, path: string, out: NumberAt[]): NumberAt[] {
  if (typeof value === 'number') {
    out.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectNumbers(v, `${path}[${i}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectNumbers(v, `${path}.${k}`, out);
  }
  return out;
}

function expectDisplaySafe(label: string, value: unknown): void {
  for (const { path, value: n } of collectNumbers(value, label, [])) {
    expect(Number.isFinite(n), `${path} = ${n}`).toBe(true);
    // project.ts uses -Number.MAX_VALUE as a sentinel; it must never reach a display field.
    expect(Math.abs(n) === Number.MAX_VALUE, `${path} is a MAX_VALUE sentinel`).toBe(false);
  }
}

function expectCoverageView(label: string, c: CoverageView): void {
  expect(c.icr === null, `${label}.icr null iff debtFree`).toBe(c.debtFree);
}

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('unexpected engine error');
  return r.value;
};

const arbPaths = fc.integer({ min: 1, max: 200 });

/** Firm whose latest-year assets let sell_assets 0.3 repay all debt at any recovery in [0.6, 0.8]. */
function withHugeAssets(firm: Firm): Firm {
  const latestFy = Math.max(...firm.years.map((y) => y.fy));
  return {
    ...firm,
    years: firm.years.map((y) =>
      y.fy === latestFy && y.total_debt_usd !== null
        ? { ...y, total_assets_usd: (y.total_debt_usd / 0.18) * 1.01 }
        : y,
    ),
  };
}

/** Puts sell_assets 0.3 first, keeps at most two other tools. */
function withFullSale(t: Treatment): Treatment {
  const others = t.filter((x) => x.name !== 'sell_assets').slice(0, 2);
  return [{ name: 'sell_assets', params: { s: 0.3 } }, ...others];
}

describe('display safety', () => {
  // Feature: rescue-engine, Property 18: No NaN or Infinity in display fields
  // **Validates: Requirements 8.8, 8.14, 14.1, 14.5, 14.9**
  it('every number in Diagnosis, PostState, SimulationResult and Outcome is finite; icr null iff debtFree', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        arbPaths,
        (firm, treatment, delta, macro, seed, paths) => {
          const d = unwrap(diagnose(firm, delta, macro));
          expectDisplaySafe('diagnosis', d);

          const post = unwrap(applyTreatment(firm, treatment, delta, macro));
          expectDisplaySafe('post', post);
          expectCoverageView('post.year0', post.year0);

          const sim = unwrap(simulate(firm, treatment, delta, macro, { paths, seed }));
          expectDisplaySafe('simulation', sim);
          sim.medianIcr.forEach((c, i) => expectCoverageView(`simulation.medianIcr[${i}]`, c));
          expectCoverageView('simulation.post.year0', sim.post.year0);

          const out = unwrap(drawOutcome(firm, treatment, delta, macro, seed));
          expectDisplaySafe('outcome', out);
          out.years.forEach((y, i) => expectCoverageView(`outcome.years[${i}].coverage`, y.coverage));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('D′ = 0 gives debt-free, covered years and the text "debt-free"', () => {
    let debtFreeCases = 0;

    fc.assert(
      fc.property(
        arbValidFirm.map(withHugeAssets),
        arbTreatment.map(withFullSale),
        arbDelta,
        arbMacroValid,
        arbSeed,
        arbPaths,
        (firm, treatment, delta, macro, seed, paths) => {
          const post = unwrap(applyTreatment(firm, treatment, delta, macro));
          expect(post.debtPreFee).toBe(0);
          debtFreeCases++;
          expect(post.debtFree).toBe(true);
          expect(post.coverageText).toBe('debt-free');
          expect(post.year0.debtFree).toBe(true);
          expect(post.year0.icr).toBeNull();
          expectDisplaySafe('post', post);

          const sim = unwrap(simulate(firm, treatment, delta, macro, { paths, seed }));
          expectDisplaySafe('simulation', sim);
          expect(sim.debtFree).toBe(true);
          expect(sim.debtFreeShare).toBe(1);
          expect(sim.survivalOdds).toBe(1);
          expect(sim.post.coverageText).toBe('debt-free');
          for (const c of sim.medianIcr) {
            expect(c.debtFree).toBe(true);
            expect(c.icr).toBeNull();
          }

          const out = unwrap(drawOutcome(firm, treatment, delta, macro, seed));
          expectDisplaySafe('outcome', out);
          expect(out.debtFree).toBe(true);
          expect(out.rescued).toBe(true);
          for (const y of out.years) {
            expect(y.coverage.debtFree).toBe(true);
            expect(y.coverage.icr).toBeNull();
          }
        },
      ),
      { numRuns: 150 },
    );

    expect(debtFreeCases).toBeGreaterThanOrEqual(100);
  });
});
