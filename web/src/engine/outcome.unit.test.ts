import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import { seedFrom } from './hash';
import { drawOutcome, failureMessage, pct1 } from './outcome';
import { simulate } from './simulate';
import type { Outcome, Treatment } from './types';

const macro = () => structuredClone(fixtureMacro);
const firm = () => structuredClone(ashgroveWorks);

function draw(treatment: Treatment, delta: number, seed: number): Outcome {
  const res = drawOutcome(firm(), treatment, delta, macro(), seed);
  if (!res.ok) throw new Error(`drawOutcome failed: ${res.error.code}`);
  return res.value;
}

const cut = (c: number): Treatment => [{ name: 'cut_costs', params: { c } }];

describe('drawOutcome hint (Req 9.5 to 9.7, 9.11)', () => {
  it('finds the smallest extra cut for an empty treatment', () => {
    const o = draw([], 0.01, 1);
    expect(o.rescued).toBe(false);
    expect(o.failingYear).toBe(1);
    expect(o.message).toBe(
      'Year 1: operating margin 5.5%, coverage 0.92. Ashgrove Works stays undead.',
    );
    expect(o.hint).not.toBeNull();
    expect(o.hint?.extraCut).toBeCloseTo(0.007, 12);
    expect(o.hint?.totalCut).toBeCloseTo(0.007, 12);
    expect(o.hint?.text).toBe(
      'What it would take: a cost cut of 0.7 percentage points would have kept year 1 at coverage 1 or above.',
    );
  });

  it('scans upward from an existing cut and words it as an extra cut', () => {
    const o = draw(cut(0.02), 0.01, 1);
    expect(o.rescued).toBe(false);
    expect(o.failingYear).toBe(2);
    expect(o.hint?.extraCut).toBeCloseTo(0.01, 12);
    expect(o.hint?.totalCut).toBeCloseTo(0.03, 12);
    expect(o.hint?.text).toBe(
      'What it would take: an extra cost cut of 1.0 percentage points would have kept year 2 at coverage 1 or above.',
    );
  });

  it('returns no hint when no cut within the allowed range works', () => {
    const o = draw([], 0.05, 2);
    expect(o.rescued).toBe(false);
    expect(o.failingYear).toBe(1);
    expect(o.hint).toBeNull();
  });

  it('returns no hint when the cut is already at the 0.08 maximum (K = 0)', () => {
    const o = draw(cut(0.08), 0.01, 1);
    expect(o.rescued).toBe(false);
    expect(o.failingYear).toBe(3);
    expect(o.hint).toBeNull();
  });

  it('words the hint as a plain cost cut for a 3-tool treatment without cut_costs', () => {
    const treatment: Treatment = [
      { name: 'sell_assets', params: { s: 0.1 } },
      { name: 'debt_for_equity', params: { w: 0.1 } },
      { name: 'refinance', params: {} },
    ];
    const o = draw(treatment, 0.01, 1);
    expect(o.failingYear).toBe(2);
    expect(o.hint?.extraCut).toBeCloseTo(0.014, 12);
    expect(o.hint?.totalCut).toBeCloseTo(0.014, 12);
    expect(o.hint?.text).toBe(
      'What it would take: a cost cut of 1.4 percentage points would have kept year 2 at coverage 1 or above.',
    );
    expect(o.hint?.text).not.toContain('extra');
  });
});

describe('failure message format (Req 9.4, 9.9)', () => {
  it('formats year, margin, coverage and name for a constructed path', () => {
    expect(failureMessage(2, 0.1234, 0.5, 'Acme Corp')).toBe(
      'Year 2: operating margin 12.3%, coverage 0.50. Acme Corp stays undead.',
    );
  });

  it('prints a margin of -0.04% as 0.0, never -0.0', () => {
    expect(pct1(-0.0004)).toBe('0.0');
    expect(failureMessage(1, -0.0004, 0.5, 'Acme Corp')).toBe(
      'Year 1: operating margin 0.0%, coverage 0.50. Acme Corp stays undead.',
    );
  });

  it('keeps the minus sign for margins that round to a non-zero value', () => {
    expect(pct1(-0.0123)).toBe('-1.2');
  });
});

describe('drawOutcome path and seed (Req 9.11, 9.12, 15.5)', () => {
  const cases: { label: string; treatment: Treatment; delta: number; seed: number }[] = [
    { label: 'empty', treatment: [], delta: 0.01, seed: 1 },
    { label: 'cut', treatment: cut(0.08), delta: 0.05, seed: 3 },
    {
      label: 'sell + swap + refinance',
      treatment: [
        { name: 'sell_assets', params: { s: 0.1 } },
        { name: 'debt_for_equity', params: { w: 0.1 } },
        { name: 'refinance', params: {} },
      ],
      delta: 0.02,
      seed: 12345,
    },
  ];

  it.each(cases)('equals path 0 of simulate with paths 1 ($label)', (c) => {
    const o = draw(c.treatment, c.delta, c.seed);
    const sim = simulate(firm(), c.treatment, c.delta, macro(), { seed: c.seed, paths: 1 });
    if (!sim.ok) throw new Error('simulate failed');
    expect(sim.value.survivalOdds).toBe(o.rescued ? 1 : 0);
    o.years.forEach((y, i) => {
      expect(sim.value.medianIcr[i]).toEqual(y.coverage);
    });
  });

  it.each([1.5, -1, 4294967296, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects seed %s with invalid_seed',
    (seed) => {
      const res = drawOutcome(firm(), [], 0.01, macro(), seed);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.code).toBe('invalid_seed');
    },
  );

  it('does not coerce a string seed', () => {
    const res = drawOutcome(firm(), [], 0.01, macro(), '1' as unknown as number);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('invalid_seed');
      expect(res.error.detail?.value).toBe('1');
    }
  });

  it('accepts the seed bounds 0 and 4294967295', () => {
    expect(drawOutcome(firm(), [], 0.01, macro(), 0).ok).toBe(true);
    expect(drawOutcome(firm(), [], 0.01, macro(), 4294967295).ok).toBe(true);
  });

  it('gives deeply equal outcomes from seedFrom + drawOutcome on repeated calls', () => {
    const treatment: Treatment = [
      { name: 'cut_costs', params: { c: 0.03 } },
      { name: 'refinance', params: {} },
    ];
    const run = (): Outcome => {
      const seed = seedFrom('0000123456', treatment, '2026-10-31');
      if (!seed.ok) throw new Error('seedFrom failed');
      return draw(treatment, 0.02, seed.value);
    };
    const a = run();
    const b = run();
    expect(b).toEqual(a);
    expect(b.seed).toBe(a.seed);
  });
});
