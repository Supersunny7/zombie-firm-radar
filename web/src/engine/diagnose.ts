import type { Firm, Macro } from '../types/data';
import type { EngineResult } from './errors';
import { ok } from './errors';
import { icr } from './icr';
import { prepare } from './inputs';
import type { Diagnosis } from './types';

/**
 * True when the firm is below coverage 1 under the shock.
 * x > 0 means more EBIT is needed; x <= 0 means interest is already covered
 * (exactly 0 is coverage exactly 1); null (E <= 0) means below coverage 1.
 */
export function belowCoverageFor(x: number | null): boolean {
  return x === null || x > 0;
}

/** Pre-treatment diagnosis: what it would take to reach coverage 1 under the shock. */
export function diagnose(firm: Firm, delta: number, macro: Macro): EngineResult<Diagnosis> {
  const prepared = prepare(firm, delta, macro);
  if (!prepared.ok) return prepared;

  const { E, D, r } = prepared.value;
  const shockedInterest = D * (r + delta);
  // prepare guarantees D > 0 and r > 0, so the interest is positive and icr is non-null.
  const shockedIcr = icr(E, shockedInterest) as number;

  const neededEbitIncrease = E > 0 ? shockedInterest / E - 1 : null;
  const neededDebtCut = E > 0 ? 1 - shockedIcr : null;
  const neededRate = E / D;
  const belowCoverage = belowCoverageFor(neededEbitIncrease);

  return ok({
    shockedIcr,
    neededEbitIncrease,
    neededDebtCut,
    neededRate,
    belowCoverage,
    summary: belowCoverage
      ? 'Below coverage 1 under the shock.'
      : 'Already covers its interest under the shock.',
  });
}
