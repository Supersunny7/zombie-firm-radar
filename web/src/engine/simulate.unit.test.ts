import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { Firm, FirmYear } from '../types/data';
import { applyCore } from './apply';
import { prepare } from './inputs';
import { projectPath } from './project';
import { blocksFor, mulberry32 } from './rng';
import { median, simulate, simulateWith } from './simulate';
import type { SimulateOptions, Treatment } from './types';

const DELTA = 0.02;
const macro = () => structuredClone(fixtureMacro);
const firm = () => structuredClone(ashgroveWorks);

/** Small debt so that a 30% asset sale repays everything (debt-free after treatment). */
function smallDebtFirm(): Firm {
  const f = firm();
  const last = f.years[f.years.length - 1] as FirmYear;
  last.total_debt_usd = 100e6;
  last.interest_expense_usd = 5e6;
  return f;
}

/** Straightforward per-path recompute: applyCore with the path's own recovery every time. */
function naive(f: Firm, treatment: Treatment, seed: number, paths: number) {
  const prepared = prepare(f, DELTA, macro());
  if (!prepared.ok) throw new Error('prepare failed');
  const inputs = prepared.value;
  const canonical = treatment as Parameters<typeof applyCore>[1];
  const blocks = blocksFor(seed, paths);
  const y: number[][] = [[], [], []];
  let covered = 0;
  for (const block of blocks) {
    const post = applyCore(inputs, canonical, block.recovery);
    const p = projectPath(inputs, post, block);
    p.icr.forEach((v, i) => (y[i] as number[]).push(v));
    if (p.icr.every((v) => v >= 1)) covered++;
  }
  return { survival: covered / paths, medians: y.map((col) => median(col)) };
}

describe('simulate', () => {
  it('runs exactly 1000 paths when paths is omitted', () => {
    const treatment: Treatment = [{ name: 'cut_costs', params: { c: 0.05 } }];
    let draws = 0;
    const res = simulateWith(firm(), treatment, DELTA, macro(), { seed: 7 }, (s) => {
      const g = mulberry32(s);
      return () => {
        draws++;
        return g();
      };
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.paths).toBe(1000);
    expect(draws).toBe(6000);
  });

  it('always includes the constant-debt note', () => {
    const res = simulate(firm(), [], DELTA, macro(), { seed: 1, paths: 10 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.constantDebtNote).toContain('Debt stays constant');
  });

  it.each([
    [
      'without sell_assets',
      [
        { name: 'cut_costs', params: { c: 0.04 } },
        { name: 'debt_for_equity', params: { w: 0.3 } },
        { name: 'refinance', params: {} },
      ],
    ],
    [
      'with sell_assets',
      [
        { name: 'sell_assets', params: { s: 0.2 } },
        { name: 'debt_for_equity', params: { w: 0.2 } },
        { name: 'refinance', params: {} },
      ],
    ],
  ] as [string, Treatment][])(
    'reuse-post optimisation equals a naive recompute %s',
    (_label, treatment) => {
      const seed = 12345;
      const paths = 300;
      const res = simulate(firm(), treatment, DELTA, macro(), { seed, paths });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const expected = naive(firm(), treatment, seed, paths);
      expect(res.value.survivalOdds).toBe(expected.survival);
      res.value.medianIcr.forEach((view, i) => {
        const m = expected.medians[i] as number;
        expect(view.icr).toBe(Number.isFinite(m) ? m : null);
        expect(view.debtFree).toBe(m === Infinity);
      });
    },
  );

  it('median handles even counts and Infinity', () => {
    expect(median([1, 3, 2, 10])).toBe(2.5);
    expect(median([1, Infinity])).toBe(Infinity);
  });

  it.each([0, 1.5, 100001])('rejects paths = %s with invalid_paths', (paths) => {
    const res = simulate(firm(), [], DELTA, macro(), { seed: 1, paths });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('invalid_paths');
  });

  it.each([-1, 1.5, 4294967296, '5' as unknown as number])(
    'rejects seed = %j with invalid_seed',
    (seed) => {
      const options = { seed, paths: 10 } as SimulateOptions;
      const res = simulate(firm(), [], DELTA, macro(), options);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.code).toBe('invalid_seed');
    },
  );

  it('a debt-free treatment gives debtFree true and survival odds 1', () => {
    const treatment: Treatment = [{ name: 'sell_assets', params: { s: 0.3 } }];
    const res = simulate(smallDebtFirm(), treatment, DELTA, macro(), { seed: 3, paths: 200 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.debtFree).toBe(true);
    expect(res.value.debtFreeShare).toBe(1);
    expect(res.value.survivalOdds).toBe(1);
  });
});
