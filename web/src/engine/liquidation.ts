export interface LiquidationRecovery {
  /** Creditor recovery in [0, 1]. */
  readonly recovery: number;
  /** Recovery as whole cents on the dollar, an integer in [0, 100]. */
  readonly centsOnDollar: number;
}

/**
 * Creditor recovery on liquidation: min(1, 0.5 * A / D).
 * D not greater than 0 (or NaN) means nothing is owed, so recovery is 1.
 * A NaN or negative A counts as 0.
 */
export function liquidationRecovery(A: number, D: number): LiquidationRecovery {
  const recovery = !(D > 0) ? 1 : Math.min(1, (0.5 * (A > 0 ? A : 0)) / D);
  return { recovery, centsOnDollar: Math.round(recovery * 100) };
}
