import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { FirmYear } from '../types/data';
import { applyCore } from './apply';
import { icr } from './icr';
import { prepare } from './inputs';
import { projectPath } from './project';
import type { RandomBlock } from './rng';
import type { ToolChoice } from './types';

describe('named counterexamples', () => {
  it('RR-1 negative-EBIT counterexample', () => {
    // EBIT_t = -10; halving interest (100 -> 50) makes a negative ICR more negative.
    const before = icr(-10, 100);
    const after = icr(-10, 50);
    expect(before).toBeCloseTo(-0.1, 12);
    expect(after).toBeCloseTo(-0.2, 12);
    expect(after as number).toBeLessThan(before as number);
  });

  it('RR-2 high-margin trade-off', () => {
    const firm = structuredClone(ashgroveWorks);
    const last = firm.years[firm.years.length - 1] as FirmYear;
    const R = 1e9;
    last.revenue_usd = R;
    last.ebit_usd = 0.9 * R; // E/R = 0.9
    last.interest_expense_usd = 5e7;
    last.total_debt_usd = 1e9;
    last.total_assets_usd = 2e9;
    last.equity_usd = 5e8;
    firm.rescue_inputs.margin_mean = 0.9;
    firm.rescue_inputs.revenue_growth_median = 0.01; // g, inside the clamp range

    const prepared = prepare(firm, 0, structuredClone(fixtureMacro));
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const inputs = prepared.value;

    const block: RandomBlock = { recovery: 0.7, haircut: 0.4, eps: [0, 0, 0] };
    const year1Ebit = (c: number): number => {
      const treatment: ToolChoice[] = c === 0 ? [] : [{ name: 'cut_costs', params: { c } }];
      const post = applyCore(inputs, treatment, block.recovery);
      return projectPath(inputs, post, block).ebit[0];
    };

    // By hand, c = 0:    m1 = 0.9 + 0.3 * (0.9 - 0.9) = 0.9;  R1 = R * 1.01        -> 0.909 R
    // By hand, c = 0.08: E' = 0.9R + 0.08 * 0.1R = 0.908R, m0 = 0.908,
    //   m1 = 0.908 + 0.3 * (0.9 - 0.908) = 0.9056;  R1 = R * (1.01 - 0.04) = 0.97R -> 0.878432 R
    const e0 = year1Ebit(0);
    const e8 = year1Ebit(0.08);
    expect(Math.abs(e0 - 0.909 * R)).toBeLessThanOrEqual(1e-9 * 0.909 * R);
    expect(Math.abs(e8 - 0.878432 * R)).toBeLessThanOrEqual(1e-9 * 0.878432 * R);
    expect(e8).toBeLessThan(e0);
  });
});
