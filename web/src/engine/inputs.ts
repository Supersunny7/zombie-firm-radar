import type { Firm, FirmYear, Macro } from '../types/data';
import { deltaOutOfRange, fail, notRescuable, ok } from './errors';
import type { EngineResult, InputName } from './errors';

export interface Inputs {
  readonly cik: string;
  readonly name: string;
  readonly fy: number;
  readonly R: number;
  readonly E: number;
  readonly I: number;
  readonly D: number;
  readonly A: number;
  readonly Q: number;
  /** I / D */
  readonly r: number;
  /** macro.dgs10.value */
  readonly b: number;
  readonly delta: number;
  /** rescue_inputs.margin_mean */
  readonly marginMean: number;
  readonly kappa: 0.3;
  /** clamp(margin_change_sd, 0.01, 0.08) */
  readonly sigma: number;
  /** clamp(revenue_growth_median, -0.15, 0.15) */
  readonly g: number;
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

function latestYear(years: readonly [FirmYear, ...FirmYear[]]): FirmYear {
  let best: FirmYear = years[0];
  for (const y of years) if (y.fy > best.fy) best = y;
  return best;
}

/** Validates in Validation_Order (delta, firm, b) and builds the engine inputs. Never throws or mutates. */
export function prepare(firm: Firm, delta: number, macro: Macro): EngineResult<Inputs> {
  if (!isNum(delta) || delta < 0 || delta > 0.05) return fail(deltaOutOfRange(delta));

  const years = firm?.years;
  if (!Array.isArray(years) || years.length === 0) {
    return fail(notRescuable(['years'], 'missing'));
  }

  const y = latestYear(years as [FirmYear, ...FirmYear[]]);
  const raw: readonly [InputName, unknown][] = [
    ['R', y.revenue_usd],
    ['E', y.ebit_usd],
    ['I', y.interest_expense_usd],
    ['D', y.total_debt_usd],
    ['A', y.total_assets_usd],
    ['Q', y.equity_usd],
  ];
  const bad = raw.filter(([, v]) => !isNum(v));
  if (bad.length > 0) {
    const anyNull = bad.some(([, v]) => v === null || v === undefined);
    return fail(
      notRescuable(
        bad.map(([n]) => n),
        anyNull ? 'missing' : 'unusable',
        y.fy,
      ),
    );
  }

  const R = y.revenue_usd as number;
  const E = y.ebit_usd as number;
  const I = y.interest_expense_usd as number;
  const D = y.total_debt_usd as number;
  const A = y.total_assets_usd as number;
  const Q = y.equity_usd as number;

  const unusable: InputName[] = [];
  if (D <= 0) unusable.push('D');
  if (R <= 0) unusable.push('R');
  if (I <= 0) unusable.push('I');
  if (unusable.length > 0) return fail(notRescuable(unusable, 'unusable', y.fy));

  const b = macro?.dgs10?.value;
  if (!isNum(b) || b < 0) return fail(notRescuable(['b'], 'unusable'));

  const ri = firm.rescue_inputs;
  return ok({
    cik: firm.cik,
    name: firm.name,
    fy: y.fy,
    R,
    E,
    I,
    D,
    A,
    Q,
    r: I / D,
    b,
    delta,
    marginMean: ri.margin_mean,
    kappa: 0.3,
    sigma: clamp(ri.margin_change_sd, 0.01, 0.08),
    g: clamp(ri.revenue_growth_median, -0.15, 0.15),
  });
}
