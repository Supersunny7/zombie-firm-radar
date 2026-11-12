import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Firm } from '../types/data';
import { applyCore } from './apply';
import { drawOutcome } from './outcome';
import { prepare } from './inputs';
import { projectPath } from './project';
import { blocksFor } from './rng';
import { parseTreatment } from './treatment';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';
import type { ToolChoice } from './types';

/**
 * Firms biased towards weak coverage: the latest year gets interest I, revenue
 * R = k * I and EBIT = ratio * I, so many paths fail and a modest cut often (but
 * not always) repairs them. margin_mean follows the firm's own margin.
 */
const arbWeakFirm: fc.Arbitrary<Firm> = fc
  .tuple(
    arbValidFirm,
    fc.double({ min: 0.3, max: 1.4, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 3, max: 40, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: 0.5, max: 1.5, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([firm, ratio, k, meanFactor]): Firm => {
    const latest = firm.years.reduce((a, y) => (y.fy > a.fy ? y : a));
    const I = latest.interest_expense_usd as number;
    const R = k * I;
    const E = ratio * I;
    return {
      ...firm,
      years: firm.years.map((y) =>
        y === latest ? { ...y, revenue_usd: R, ebit_usd: E, icr: ratio } : y,
      ),
      rescue_inputs: { ...firm.rescue_inputs, margin_mean: (E / R) * meanFactor },
    };
  });

const arbFirm: fc.Arbitrary<Firm> = fc.oneof(
  { weight: 3, arbitrary: arbWeakFirm },
  { weight: 1, arbitrary: arbValidFirm },
);

const MAX_CUT = 0.08;

describe('Property 22: hint scan (property)', () => {
  // Feature: rescue-engine, Property 22: The hint is the smallest working extra cut on the grid
  // **Validates: Requirements 9.5, 9.6, 9.7, 9.11**
  it('hint is the smallest working extra cut on the 0.1 pp grid, or null when none works', () => {
    const seen = { present: 0, absent: 0, rescued: 0, threeToolNoCut: 0 };

    fc.assert(
      fc.property(
        arbFirm,
        arbMacroValid,
        arbDelta,
        arbTreatment,
        arbSeed,
        (firm, macro, delta, treatment, seed) => {
          const parsed = parseTreatment(treatment);
          const prepared = prepare(firm, delta, macro);
          expect(parsed.ok && prepared.ok).toBe(true);
          if (!parsed.ok || !prepared.ok) return;
          const inputs = prepared.value;
          const tools = parsed.value;
          const block = blocksFor(seed, 1)[0]!;

          const cutTool = tools.find((t) => t.name === 'cut_costs');
          const c0 = cutTool && cutTool.name === 'cut_costs' ? cutTool.params.c : 0;
          const rest: ToolChoice[] = tools.filter((t) => t.name !== 'cut_costs');
          const f = (c: number, year: number): number => {
            const treat: ToolChoice[] = [...rest, { name: 'cut_costs', params: { c } }];
            const post = applyCore(inputs, treat, block.recovery);
            return projectPath(inputs, post, block).icr[year - 1] as number;
          };

          const res = drawOutcome(firm, treatment, delta, macro, seed);
          expect(res.ok).toBe(true);
          if (!res.ok) return;
          const out = res.value;

          if (out.rescued) {
            seen.rescued++;
            expect(out.failingYear).toBeNull();
            expect(out.hint).toBeNull();
            return;
          }
          const ts = out.failingYear as 1 | 2 | 3;
          const K = Math.floor((MAX_CUT - c0) / 0.001 + 1e-9);
          if (tools.length === 3 && cutTool === undefined) seen.threeToolNoCut++;

          if (out.hint !== null) {
            seen.present++;
            const k = Math.round(out.hint.extraCut * 1000);
            expect(Number.isInteger(k) && k >= 1).toBe(true);
            expect(out.hint.extraCut).toBe(k / 1000);
            expect(k).toBeLessThanOrEqual(K);
            expect(out.hint.totalCut).toBe(Math.min(MAX_CUT, c0 + k / 1000));
            expect(out.hint.totalCut).toBeLessThanOrEqual(MAX_CUT);
            expect(f(out.hint.totalCut, ts)).toBeGreaterThanOrEqual(1);
            for (let j = 1; j < k; j++) {
              expect(f(Math.min(MAX_CUT, c0 + j / 1000), ts)).toBeLessThan(1);
            }
            const pp = (k / 10).toFixed(1);
            const what = cutTool !== undefined ? 'an extra cost cut' : 'a cost cut';
            expect(out.hint.text).toBe(
              `What it would take: ${what} of ${pp} percentage points would have kept year ${ts} at coverage 1 or above.`,
            );
            expect(out.hint.text).not.toMatch(/should|recommend|advise/i);
          } else {
            seen.absent++;
            for (let j = 1; j <= K; j++) {
              expect(f(Math.min(MAX_CUT, c0 + j / 1000), ts)).toBeLessThan(1);
            }
          }
        },
      ),
      { numRuns: 300 },
    );

    expect(seen.present).toBeGreaterThan(0);
    expect(seen.absent).toBeGreaterThan(0);
    expect(seen.threeToolNoCut).toBeGreaterThan(0);
  });
});
