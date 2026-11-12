import { icr } from './icr';
import type { Inputs } from './inputs';
import type { RandomBlock } from './rng';
import type { PostState } from './types';

export interface PathResult {
  /** m_1..m_3 */
  readonly margin: readonly [number, number, number];
  /** R_1..R_3 */
  readonly revenue: readonly [number, number, number];
  readonly ebit: readonly [number, number, number];
  /** +Infinity when debt-free (internal only). */
  readonly icr: readonly [number, number, number];
  readonly debtFree: boolean;
}

/**
 * Sentinel for the unreachable case where icr() returns null for a year that is not
 * debt-free (non-positive or non-finite interest, or NaN EBIT). It is finite, far below 1
 * (never counts as covered), and keeps medians NaN-free.
 */
const UNCOVERED = -Number.MAX_VALUE;

/**
 * Projects one path over 3 years (Req 8.5 to 8.8). Pure; debt stays constant.
 * m_t = m_{t-1} + kappa * (marginMean - m_{t-1}) + sigma * eps_t,
 * R_t = R_{t-1} * (1 + g - growthCut), EBIT_t = m_t * R_t.
 */
export function projectPath(inputs: Inputs, post: PostState, block: RandomBlock): PathResult {
  const factor = 1 + inputs.g - post.growthCut;
  let m = post.ebit / post.revenue;
  let rev = post.revenue;

  const margin: number[] = [];
  const revenue: number[] = [];
  const ebit: number[] = [];
  const cover: number[] = [];

  for (const eps of block.eps) {
    m = m + inputs.kappa * (inputs.marginMean - m) + inputs.sigma * eps;
    rev = rev * factor;
    const e = m * rev;
    margin.push(m);
    revenue.push(rev);
    ebit.push(e);
    if (post.debtFree) {
      cover.push(Infinity);
    } else {
      cover.push(icr(e, post.interest) ?? UNCOVERED);
    }
  }

  return {
    margin: margin as unknown as PathResult['margin'],
    revenue: revenue as unknown as PathResult['revenue'],
    ebit: ebit as unknown as PathResult['ebit'],
    icr: cover as unknown as PathResult['icr'],
    debtFree: post.debtFree,
  };
}
