import { icr } from './icr';
import type { Inputs } from './inputs';
import type { RefinanceInfo } from './types';

const FEE = 1.02;

/** Credit spread tier for the pre-refinance coverage. Negative coverage counts as below 1. */
export function spreadFor(icrPre: number): 0.09 | 0.06 | 0.035 | 0.02 {
  if (icrPre < 1) return 0.09;
  if (icrPre < 1.5) return 0.06;
  if (icrPre < 3) return 0.035;
  return 0.02;
}

/** Strict test: refinancing applies only when the rate after the 2% fee is lower than the old rate. */
export function refinanceApplies(oldRate: number, newRate: number): boolean {
  return FEE * newRate < oldRate;
}

export interface RefinanceEvaluation {
  readonly info: RefinanceInfo;
  /** Effective rate used for interest: 1.02 * newRate when applied, else oldRate. */
  readonly effRate: number;
  /** D'pre * effRate */
  readonly interest: number;
  /** D'pre * 1.02 when applied, else D'pre (display only) */
  readonly debtShown: number;
  /** newRate when applied, else oldRate (display only) */
  readonly rateShown: number;
}

const pct = (x: number): string => `${(x * 100).toFixed(2)}%`;

/** Evaluates refinance on the post cut/sell/swap state. Always called last. */
export function evaluateRefinance(
  inputs: Inputs,
  ebitPost: number,
  debtPre: number,
): RefinanceEvaluation {
  const oldRate = inputs.r + inputs.delta;

  if (debtPre === 0) {
    return {
      info: {
        requested: true,
        applied: false,
        icrPre: null,
        spread: null,
        oldRate,
        newRate: null,
        note: 'No debt remains to refinance.',
      },
      effRate: oldRate,
      interest: 0,
      debtShown: 0,
      rateShown: oldRate,
    };
  }

  const icrPre = icr(ebitPost, debtPre * oldRate);
  // icrPre is never null here (debtPre > 0, oldRate > 0); treat null as below 1.
  const spread = icrPre === null ? 0.09 : spreadFor(icrPre);
  const newRate = inputs.b + inputs.delta + spread;
  const applied = refinanceApplies(oldRate, newRate);

  const effRate = applied ? FEE * newRate : oldRate;
  const note = applied
    ? `Refinanced from ${pct(oldRate)} to ${pct(newRate)} plus a 2% fee.`
    : `Refinancing at ${pct(newRate)} plus the 2% fee would not lower the current rate of ${pct(oldRate)}, so the annual interest cost would not fall.`;

  return {
    info: { requested: true, applied, icrPre, spread, oldRate, newRate, note },
    effRate,
    interest: debtPre * effRate,
    debtShown: applied ? debtPre * FEE : debtPre,
    rateShown: applied ? newRate : oldRate,
  };
}
