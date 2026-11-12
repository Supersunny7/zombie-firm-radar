import type { Firm, Macro } from '../types/data';
import { applyCore } from './apply';
import { deltaOutOfRange, fail, invalidPaths, invalidSeed, ok } from './errors';
import type { EngineResult } from './errors';
import { prepare } from './inputs';
import { projectPath } from './project';
import { blocksFor, mulberry32 } from './rng';
import type { RandomBlock } from './rng';
import { parseTreatment } from './treatment';
import type { CoverageView, SimulateOptions, SimulationResult, Treatment } from './types';

const DEFAULT_PATHS = 1000;
const MAX_PATHS = 100000;
const MAX_SEED = 4294967295;

/** Shared seed rule (Req 8.16, 9.12): an integer in [0, 4294967295], never coerced. */
export const isValidSeed = (seed: unknown): seed is number =>
  typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED;

/**
 * Median of a list of numbers. Sorts a Float64Array copy numerically (handles Infinity);
 * an even count averages the two middle values. Returns NaN for an empty list.
 */
export function median(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) return Number.NaN;
  const a = Float64Array.from(values).sort();
  if (n % 2 === 1) return a[(n - 1) / 2] as number;
  return ((a[n / 2 - 1] as number) + (a[n / 2] as number)) / 2;
}

const toView = (m: number): CoverageView => ({
  icr: Number.isFinite(m) ? m : null,
  debtFree: m === Infinity,
});

/**
 * Same as `simulate` with an injectable generator factory. Test-only seam (counting uniforms);
 * not exported from the public entry.
 */
export function simulateWith(
  firm: Firm,
  treatment: Treatment,
  delta: number,
  macro: Macro,
  options: SimulateOptions,
  makeGenerator: (seed: number) => () => number = mulberry32,
): EngineResult<SimulationResult> {
  // Validation_Order: delta, treatment, firm, b, paths, seed.
  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0 || delta > 0.05) {
    return fail(deltaOutOfRange(delta));
  }
  const parsed = parseTreatment(treatment);
  if (!parsed.ok) return fail(parsed.error);
  const prepared = prepare(firm, delta, macro);
  if (!prepared.ok) return fail(prepared.error);

  const rawPaths: unknown = options?.paths;
  const paths = rawPaths === undefined ? DEFAULT_PATHS : rawPaths;
  if (typeof paths !== 'number' || !Number.isInteger(paths) || paths < 1 || paths > MAX_PATHS) {
    return fail(invalidPaths(rawPaths));
  }
  const seed: unknown = options?.seed;
  if (!isValidSeed(seed)) return fail(invalidSeed(seed));

  const inputs = prepared.value;
  const canonical = parsed.value;
  const blocks = blocksFor(seed, paths, makeGenerator);

  const hasSell = canonical.some((t) => t.name === 'sell_assets');
  const displayPost = applyCore(inputs, canonical, 0.7);

  const y1 = new Float64Array(paths);
  const y2 = new Float64Array(paths);
  const y3 = new Float64Array(paths);
  let covered = 0;
  let debtFreePaths = 0;

  for (let k = 0; k < paths; k++) {
    const block = blocks[k] as RandomBlock;
    const post = hasSell ? applyCore(inputs, canonical, block.recovery) : displayPost;
    const path = projectPath(inputs, post, block);
    const [a, b, c] = path.icr;
    y1[k] = a;
    y2[k] = b;
    y3[k] = c;
    if (a >= 1 && b >= 1 && c >= 1) covered++;
    if (path.debtFree) debtFreePaths++;
  }

  const debtFreeShare = debtFreePaths / paths;
  return ok({
    paths,
    seed,
    survivalOdds: covered / paths,
    medianIcr: [toView(median(y1)), toView(median(y2)), toView(median(y3))],
    debtFree: debtFreePaths === paths,
    debtFreeShare,
    post: displayPost,
    constantDebtNote: 'Debt stays constant over the 3 projected years (simplification).',
  });
}

/** Monte Carlo projection over `paths` seeded paths (Req 8). Never throws. */
export function simulate(
  firm: Firm,
  treatment: Treatment,
  delta: number,
  macro: Macro,
  options: SimulateOptions,
): EngineResult<SimulationResult> {
  return simulateWith(firm, treatment, delta, macro, options);
}
