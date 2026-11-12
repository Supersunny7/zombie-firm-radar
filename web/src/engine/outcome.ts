import type { Firm, Macro } from '../types/data';
import { applyCore, fix2 } from './apply';
import { deltaOutOfRange, fail, invalidSeed, ok } from './errors';
import type { EngineResult } from './errors';
import { prepare } from './inputs';
import type { Inputs } from './inputs';
import { projectPath } from './project';
import { blocksFor } from './rng';
import type { RandomBlock } from './rng';
import { isValidSeed } from './simulate';
import { parseTreatment } from './treatment';
import type { CoverageView, Hint, Outcome, OutcomeYear, ToolChoice, Treatment } from './types';

const MAX_CUT = 0.08;

/** (x * 100).toFixed(1) with "-0.0" cleaned up to "0.0". */
export const pct1 = (x: number): string => {
  const s = (x * 100).toFixed(1);
  return s === '-0.0' ? '0.0' : s;
};

const toView = (v: number): CoverageView =>
  v === Infinity
    ? { icr: null, debtFree: true }
    : { icr: Number.isFinite(v) ? v : null, debtFree: false };

/** "Year {t}: operating margin {m}%, coverage {icr}. {name} stays undead." */
export function failureMessage(
  t: 1 | 2 | 3,
  margin: number,
  coverage: number,
  name: string,
): string {
  return `Year ${t}: operating margin ${pct1(margin)}%, coverage ${fix2(coverage)}. ${name} stays undead.`;
}

/** Replaces cut_costs or adds it; internal shape, no 3-tool cap. */
function withCut(tools: readonly ToolChoice[], c: number): ToolChoice[] {
  const rest = tools.filter((t) => t.name !== 'cut_costs');
  return [...rest, { name: 'cut_costs', params: { c } }];
}

function hintText(k: number, hasCut: boolean, year: number): string {
  const pp = (k / 10).toFixed(1);
  const what = hasCut ? 'an extra cost cut' : 'a cost cut';
  return `What it would take: ${what} of ${pp} percentage points would have kept year ${year} at coverage 1 or above.`;
}

/**
 * Upward linear scan on the 0.1 pp grid (Req 9.5 to 9.7, 9.11) on the same random block.
 * Returns the smallest working extra cut, or null.
 */
export function hintScan(
  inputs: Inputs,
  tools: readonly ToolChoice[],
  block: RandomBlock,
  failingYear: 1 | 2 | 3,
): Hint | null {
  const cutTool = tools.find((t) => t.name === 'cut_costs');
  const c0 = cutTool && cutTool.name === 'cut_costs' ? cutTool.params.c : 0;
  const K = Math.floor((MAX_CUT - c0) / 0.001 + 1e-9);
  for (let k = 1; k <= K; k++) {
    const c = Math.min(MAX_CUT, c0 + k / 1000);
    const post = applyCore(inputs, withCut(tools, c), block.recovery);
    const cover = projectPath(inputs, post, block).icr[failingYear - 1] as number;
    if (cover >= 1) {
      return {
        extraCut: k / 1000,
        totalCut: c,
        text: hintText(k, cutTool !== undefined, failingYear),
      };
    }
  }
  return null;
}

/** Draws the one real outcome of a treatment (Req 9). Never throws. */
export function drawOutcome(
  firm: Firm,
  treatment: Treatment,
  delta: number,
  macro: Macro,
  seed: number,
): EngineResult<Outcome> {
  // Validation_Order: delta, treatment, firm, b, seed.
  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0 || delta > 0.05) {
    return fail(deltaOutOfRange(delta));
  }
  const parsed = parseTreatment(treatment);
  if (!parsed.ok) return fail(parsed.error);
  const prepared = prepare(firm, delta, macro);
  if (!prepared.ok) return fail(prepared.error);
  const rawSeed: unknown = seed;
  if (!isValidSeed(rawSeed)) return fail(invalidSeed(rawSeed));

  const inputs = prepared.value;
  const tools = parsed.value;
  const block = blocksFor(seed, 1)[0] as RandomBlock;
  const post = applyCore(inputs, tools, block.recovery);
  const path = projectPath(inputs, post, block);

  const years = [1, 2, 3].map((t): OutcomeYear => ({
    t: t as 1 | 2 | 3,
    margin: path.margin[t - 1] as number,
    coverage: toView(path.icr[t - 1] as number),
  })) as unknown as Outcome['years'];

  const idx = path.icr.findIndex((v) => !(v >= 1));
  if (idx === -1) {
    return ok({
      seed,
      rescued: true,
      debtFree: path.debtFree,
      years,
      failingYear: null,
      message: null,
      hint: null,
    });
  }
  const t = (idx + 1) as 1 | 2 | 3;
  return ok({
    seed,
    rescued: false,
    debtFree: path.debtFree,
    years,
    failingYear: t,
    message: failureMessage(t, path.margin[idx] as number, path.icr[idx] as number, inputs.name),
    hint: hintScan(inputs, tools, block, t),
  });
}
