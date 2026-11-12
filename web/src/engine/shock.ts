import { icr } from './icr';
import { deltaOutOfRange, fail, ok } from './errors';
import type { EngineResult } from './errors';

export type ShockStatus = 'zombie' | 'endangered' | 'healthy' | 'insufficient_data';

/** Structural subset of FirmIndexEntry; the engine does not import UI types. */
export interface ShockInput {
  readonly status: ShockStatus;
  readonly age_years: number;
  readonly latest_icr: number | null;
  readonly total_debt_usd: number | null;
  readonly implied_rate: number | null;
  readonly shock_eligible: boolean;
}

export interface ShockResult {
  readonly shockEligible: boolean;
  /** Original status (the shock never rewrites it). */
  readonly status: ShockStatus;
  /** status === 'zombie' || newlyUndead */
  readonly undead: boolean;
  /** Crossed from ICR >= 1 to ICR < 1 because of the shock. */
  readonly newlyUndead: boolean;
  /** null when not eligible. */
  readonly shockedIcr: number | null;
}

export interface ShockBatch {
  readonly delta: number;
  readonly newlyUndead: Uint8Array;
  /** NaN where the firm is not eligible. */
  readonly shockedIcr: Float64Array;
  readonly eligible: Uint8Array;
  readonly counts: { risen: number; alreadyUndead: number; notEligible: number };
}

interface Evaluated {
  eligible: boolean;
  newlyUndead: boolean;
  shockedIcr: number | null;
}

const MIN_AGE_YEARS = 10;
const MAX_DELTA = 0.05;
const ICR_SNAP_TOLERANCE = 1e-9;

function validDelta(delta: number): boolean {
  return typeof delta === 'number' && Number.isFinite(delta) && delta >= 0 && delta <= MAX_DELTA;
}

/** Private: the single place that decides eligibility and Newly_Undead. Delta must be valid. */
function evaluate(f: ShockInput, delta: number): Evaluated {
  const notEligible: Evaluated = { eligible: false, newlyUndead: false, shockedIcr: null };
  const { latest_icr: x, total_debt_usd: d, implied_rate: r } = f;
  if (!f.shock_eligible || x === null || d === null || r === null) return notEligible;
  if (!Number.isFinite(x) || !Number.isFinite(d) || !Number.isFinite(r)) return notEligible;
  if (d <= 0 || r <= 0) return notEligible;

  const ebit = x * r * d;
  let shocked: number | null;
  if (delta === 0) {
    shocked = x;
  } else {
    shocked = icr(ebit, d * (r + delta));
    if (shocked === null) return notEligible;
    // Float tolerance: EBIT is rebuilt as x*r*d, so a mathematically exact ICR of 1 can come
    // out as 0.9999999999999999. Snap within 1e-9 of 1 to exactly 1 (design.md worked example:
    // at +1.00 pp the ICR is exactly 1.000 and the firm is NOT undead; the rule is strictly < 1).
    if (Math.abs(shocked - 1) <= ICR_SNAP_TOLERANCE) shocked = 1;
    // Rounding guard: a rate rise must never raise a non-negative ICR.
    if (ebit >= 0) shocked = Math.min(shocked, x);
  }

  const newlyUndead =
    f.status !== 'zombie' && f.age_years >= MIN_AGE_YEARS && x >= 1 && shocked < 1;
  return { eligible: true, newlyUndead, shockedIcr: shocked };
}

export function shockFirm(f: ShockInput, delta: number): EngineResult<ShockResult> {
  if (!validDelta(delta)) return fail(deltaOutOfRange(delta));
  const e = evaluate(f, delta);
  return ok({
    shockEligible: e.eligible,
    status: f.status,
    undead: f.status === 'zombie' || e.newlyUndead,
    newlyUndead: e.newlyUndead,
    shockedIcr: e.shockedIcr,
  });
}

export function shockBatch(firms: readonly ShockInput[], delta: number): EngineResult<ShockBatch> {
  if (!validDelta(delta)) return fail(deltaOutOfRange(delta));
  const n = firms.length;
  const newlyUndead = new Uint8Array(n);
  const shockedIcr = new Float64Array(n);
  const eligible = new Uint8Array(n);
  let risen = 0;
  let alreadyUndead = 0;
  let notEligible = 0;
  for (let i = 0; i < n; i++) {
    const f = firms[i] as ShockInput;
    const e = evaluate(f, delta);
    if (e.eligible) {
      eligible[i] = 1;
      shockedIcr[i] = e.shockedIcr as number;
    } else {
      shockedIcr[i] = Number.NaN;
      notEligible++;
    }
    if (e.newlyUndead) {
      newlyUndead[i] = 1;
      risen++;
    }
    if (f.status === 'zombie') alreadyUndead++;
  }
  return ok({
    delta,
    newlyUndead,
    shockedIcr,
    eligible,
    counts: { risen, alreadyUndead, notEligible },
  });
}
