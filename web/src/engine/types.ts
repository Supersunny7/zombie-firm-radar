export type V1ToolName = 'cut_costs' | 'sell_assets' | 'debt_for_equity' | 'refinance';

export type ToolChoice =
  | { readonly name: 'cut_costs'; readonly params: { readonly c: number } }
  | { readonly name: 'sell_assets'; readonly params: { readonly s: number } }
  | { readonly name: 'debt_for_equity'; readonly params: { readonly w: number } }
  | { readonly name: 'refinance'; readonly params: Readonly<Record<string, never>> };

export type Treatment = readonly ToolChoice[];

export interface PainMeters {
  readonly workers: number;
  readonly shareholders: number;
  readonly creditors: number;
}

/** `icr` is null only when `debtFree` is true. */
export interface CoverageView {
  readonly icr: number | null;
  readonly debtFree: boolean;
}

export interface RefinanceInfo {
  readonly requested: boolean;
  readonly applied: boolean;
  readonly icrPre: number | null;
  readonly spread: number | null;
  /** r + delta */
  readonly oldRate: number;
  /** b + delta + spread, null when not evaluated */
  readonly newRate: number | null;
  /** Null when refinance was not requested. */
  readonly note: string | null;
}

export interface PostState {
  /** R' */
  readonly revenue: number;
  /** E' */
  readonly ebit: number;
  /** D' after cut/sell/swap, before the refinance fee */
  readonly debtPreFee: number;
  /** Displayed D' (times 1.02 when refinance applied) */
  readonly debt: number;
  /** Displayed r' (newRate when applied, else r + delta) */
  readonly rate: number;
  /** min(1.02 * newRate, r + delta) when evaluated, else r + delta */
  readonly effRate: number;
  /** debtPreFee * effRate */
  readonly interest: number;
  /** c (0 if absent) */
  readonly cut: number;
  /** 0.5 * c */
  readonly growthCut: number;
  /** Shareholders' kept share, 1 without a swap */
  readonly keep: number;
  readonly pain: PainMeters;
  readonly refinance: RefinanceInfo;
  /** debtPreFee === 0 */
  readonly debtFree: boolean;
  readonly year0: CoverageView;
  /** "debt-free" or the year-0 ICR to 2 decimals */
  readonly coverageText: string;
}

export interface Diagnosis {
  /** icr(E, D * (r + delta)) */
  readonly shockedIcr: number;
  /** D * (r + delta) / E - 1, null if E <= 0 */
  readonly neededEbitIncrease: number | null;
  /** 1 - shockedIcr, null if E <= 0 */
  readonly neededDebtCut: number | null;
  /** E / D, any sign of E */
  readonly neededRate: number;
  readonly belowCoverage: boolean;
  readonly summary: string;
}

export interface SimulateOptions {
  readonly paths?: number;
  readonly seed: number;
}

export interface SimulationResult {
  readonly paths: number;
  readonly seed: number;
  /** In [0, 1] */
  readonly survivalOdds: number;
  readonly medianIcr: readonly [CoverageView, CoverageView, CoverageView];
  /** Every path debt-free */
  readonly debtFree: boolean;
  /** Share of debt-free paths */
  readonly debtFreeShare: number;
  /** Computed with recovery 0.7, for display */
  readonly post: PostState;
  readonly constantDebtNote: 'Debt stays constant over the 3 projected years (simplification).';
}

export interface OutcomeYear {
  readonly t: 1 | 2 | 3;
  readonly margin: number;
  readonly coverage: CoverageView;
}

export interface Hint {
  readonly extraCut: number;
  readonly totalCut: number;
  readonly text: string;
}

export interface Outcome {
  readonly seed: number;
  readonly rescued: boolean;
  readonly debtFree: boolean;
  readonly years: readonly [OutcomeYear, OutcomeYear, OutcomeYear];
  readonly failingYear: 1 | 2 | 3 | null;
  readonly message: string | null;
  readonly hint: Hint | null;
}
