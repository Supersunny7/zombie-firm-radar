import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCore } from './apply';
import { prepare } from './inputs';
import { drawOutcome } from './outcome';
import { projectPath } from './project';
import { blocksFor } from './rng';
import { simulate } from './simulate';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';
import { parseTreatment } from './treatment';
import type { CoverageView } from './types';

/** The display mapping the engine uses: Infinity is debt-free, other values are plain coverage. */
const view = (v: number): CoverageView =>
  v === Infinity
    ? { icr: null, debtFree: true }
    : { icr: Number.isFinite(v) ? v : null, debtFree: false };

describe('Core composition (property)', () => {
  // Feature: rescue-engine, Property 20: Simulation and outcome are built from the core functions
  // **Validates: Requirements 8.5, 8.9, 9.1**
  it('simulate and drawOutcome equal the naive recomputation from blocksFor, applyCore and projectPath', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbMacroValid,
        arbDelta,
        arbTreatment,
        arbSeed,
        fc.integer({ min: 1, max: 200 }),
        (firm, macro, delta, treatment, seed, paths) => {
          const prepared = prepare(firm, delta, macro);
          const parsed = parseTreatment(treatment);
          expect(prepared.ok).toBe(true);
          expect(parsed.ok).toBe(true);
          if (!prepared.ok || !parsed.ok) return;
          const inputs = prepared.value;
          const canonical = parsed.value;

          const blocks = blocksFor(seed, paths);
          const results = blocks.map((block) =>
            projectPath(inputs, applyCore(inputs, canonical, block.recovery), block),
          );
          const covered = results.filter((p) => p.icr.every((v) => v >= 1)).length;

          const sim = simulate(firm, treatment, delta, macro, { paths, seed });
          expect(sim.ok).toBe(true);
          if (!sim.ok) return;
          expect(sim.value.paths).toBe(paths);
          expect(sim.value.survivalOdds).toBe(covered / paths);
          expect(sim.value.debtFreeShare).toBe(results.filter((p) => p.debtFree).length / paths);

          const out = drawOutcome(firm, treatment, delta, macro, seed);
          expect(out.ok).toBe(true);
          if (!out.ok) return;
          const first = results[0];
          if (!first) throw new Error('no paths');
          expect(out.value.years.map((y) => y.margin)).toEqual([...first.margin]);
          expect(out.value.years.map((y) => y.coverage)).toEqual([...first.icr].map(view));
          expect(out.value.years.map((y) => y.t)).toEqual([1, 2, 3]);
          expect(out.value.rescued).toBe(first.icr.every((v) => v >= 1));
          expect(out.value.debtFree).toBe(first.debtFree);
        },
      ),
      { numRuns: 100 },
    );
  });
});
