import type { Firm, Macro } from '../types/data';
import { deltaOutOfRange, fail, ok } from './errors';
import type { EngineResult } from './errors';
import { icr } from './icr';
import { prepare } from './inputs';
import type { Inputs } from './inputs';
import { evaluateRefinance } from './refinance';
import { parseTreatment } from './treatment';
import type { CoverageView, PostState, RefinanceInfo, ToolChoice, Treatment } from './types';

const clampPain = (x: number): number => Math.min(100, Math.max(0, x));

/** toFixed(2) with "-0.00" cleaned up to "0.00". */
const fix2 = (x: number): string => {
  const s = x.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
};

function find<N extends ToolChoice['name']>(
  treatment: readonly ToolChoice[],
  name: N,
): Extract<ToolChoice, { name: N }> | undefined {
  return treatment.find((t) => t.name === name) as Extract<ToolChoice, { name: N }> | undefined;
}

/**
 * Applies the tools in Canonical_Order (cut, sell, swap, refinance last), whatever the array order.
 * Pure and non-validating: callers pass already-checked tools. Accepts any number of tools
 * (the hint scan adds cut_costs to a 3-tool treatment).
 */
export function applyCore(
  inputs: Inputs,
  treatment: readonly ToolChoice[],
  recovery: number,
): PostState {
  let revenue = inputs.R;
  let ebit = inputs.E;
  let debt = inputs.D;
  let cut = 0;
  let workers = 0;
  let shareholders = 0;
  let creditors = 0;
  let keep = 1;

  const cutTool = find(treatment, 'cut_costs');
  if (cutTool) {
    const c = cutTool.params.c;
    cut = c;
    ebit = inputs.E + c * (inputs.R - inputs.E);
    workers += (c / 0.08) * 50;
  }

  const sellTool = find(treatment, 'sell_assets');
  if (sellTool) {
    const s = sellTool.params.s;
    const sale = s * inputs.A * recovery;
    debt = Math.max(0, debt - sale);
    revenue = revenue * (1 - s);
    ebit = ebit * (1 - s);
    workers += (s / 0.3) * 35;
  }

  const swapTool = find(treatment, 'debt_for_equity');
  if (swapTool) {
    const w = swapTool.params.w;
    const converted = w * debt;
    debt = debt - converted;
    const q = Math.max(inputs.Q, 0);
    keep = q + converted === 0 ? 1 : q / (q + converted);
    shareholders += (1 - keep) * 100;
    creditors += w * 60;
  }

  const debtPreFee = debt;
  const oldRate = inputs.r + inputs.delta;
  let refinance: RefinanceInfo;
  let effRate: number;
  let interest: number;
  let debtShown: number;
  let rateShown: number;

  if (find(treatment, 'refinance')) {
    const ev = evaluateRefinance(inputs, ebit, debtPreFee);
    refinance = ev.info;
    effRate = ev.effRate;
    interest = ev.interest;
    debtShown = ev.debtShown;
    rateShown = ev.rateShown;
  } else {
    refinance = {
      requested: false,
      applied: false,
      icrPre: null,
      spread: null,
      oldRate,
      newRate: null,
      note: null,
    };
    effRate = oldRate;
    interest = debtPreFee * oldRate;
    debtShown = debtPreFee;
    rateShown = oldRate;
  }

  const debtFree = debtPreFee === 0;
  const year0: CoverageView = debtFree
    ? { icr: null, debtFree: true }
    : { icr: icr(ebit, interest), debtFree: false };
  const coverageText = debtFree || year0.icr === null ? 'debt-free' : fix2(year0.icr);

  return {
    revenue,
    ebit,
    debtPreFee,
    debt: debtShown,
    rate: rateShown,
    effRate,
    interest,
    cut,
    growthCut: 0.5 * cut,
    keep,
    pain: {
      workers: clampPain(workers),
      shareholders: clampPain(shareholders),
      creditors: clampPain(creditors),
    },
    refinance,
    debtFree,
    year0,
    coverageText,
  };
}

/** Validates in Validation_Order (delta, treatment, firm, b), then applies with recovery 0.7. */
export function applyTreatment(
  firm: Firm,
  treatment: Treatment,
  delta: number,
  macro: Macro,
): EngineResult<PostState> {
  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0 || delta > 0.05) {
    return fail(deltaOutOfRange(delta));
  }
  const parsed = parseTreatment(treatment);
  if (!parsed.ok) return fail(parsed.error);
  const prepared = prepare(firm, delta, macro);
  if (!prepared.ok) return fail(prepared.error);
  return ok(applyCore(prepared.value, parsed.value, 0.7));
}
