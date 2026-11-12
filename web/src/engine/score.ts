import type { PainMeters } from './types';

export interface ScoreInput {
  readonly rescued: boolean;
  readonly survivalOdds: number;
  readonly pain: PainMeters;
}

/** NaN maps to `lo`. */
function clamp(x: number, lo: number, hi: number): number {
  return x >= lo ? (x <= hi ? x : hi) : lo;
}

/**
 * Score = (rescued ? 1 : 0) * survivalOdds * (1 - (workers + shareholders + creditors) / 300) * 100.
 * Odds are clamped to [0, 1] and each pain meter to [0, 100], so the result is in [0, 100].
 */
export function score(input: ScoreInput): number {
  if (!input.rescued) return 0;
  const odds = clamp(input.survivalOdds, 0, 1);
  const workers = clamp(input.pain.workers, 0, 100);
  const shareholders = clamp(input.pain.shareholders, 0, 100);
  const creditors = clamp(input.pain.creditors, 0, 100);
  return odds * (1 - (workers + shareholders + creditors) / 300) * 100;
}
