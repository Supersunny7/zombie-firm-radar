import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { Firm, FirmYear, Macro } from '../types/data';
import type { EngineError } from './errors';
import { prepare } from './inputs';

function firmWith(patch: Partial<FirmYear>): Firm {
  const f = structuredClone(ashgroveWorks);
  const last = f.years[f.years.length - 1] as FirmYear;
  Object.assign(last, patch);
  return f;
}

function macroWith(value: number): Macro {
  const m = structuredClone(fixtureMacro);
  m.dgs10.value = value;
  return m;
}

function errorOf(firm: Firm, delta = 0.01, macro: Macro = fixtureMacro): EngineError {
  const res = prepare(firm, delta, macro);
  if (res.ok) throw new Error('expected failure');
  return res.error;
}

describe('prepare: success', () => {
  it('builds inputs from the latest year', () => {
    const res = prepare(structuredClone(ashgroveWorks), 0.02, fixtureMacro);
    if (!res.ok) throw new Error('expected ok');
    const v = res.value;
    expect(v.fy).toBe(2024);
    expect(v.R).toBe(1.2e9);
    expect(v.E).toBe(38e6);
    expect(v.I).toBe(61e6);
    expect(v.D).toBe(1.05e9);
    expect(v.r).toBeCloseTo(61e6 / 1.05e9, 12);
    expect(v.b).toBe(0.042);
    expect(v.delta).toBe(0.02);
    expect(v.kappa).toBe(0.3);
  });

  it('accepts delta 0 and 0.05', () => {
    expect(prepare(structuredClone(ashgroveWorks), 0, fixtureMacro).ok).toBe(true);
    expect(prepare(structuredClone(ashgroveWorks), 0.05, fixtureMacro).ok).toBe(true);
  });

  it('picks the highest fy when years are unsorted', () => {
    const f = structuredClone(ashgroveWorks);
    f.years.reverse();
    const res = prepare(f, 0, fixtureMacro);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.fy).toBe(2024);
    expect(res.value.E).toBe(38e6);
  });

  it('does not mutate the firm', () => {
    const f = structuredClone(ashgroveWorks);
    const before = structuredClone(f);
    prepare(f, 0.02, fixtureMacro);
    expect(f).toEqual(before);
  });
});

describe('prepare: not_rescuable', () => {
  it('names a single null input', () => {
    const e = errorOf(firmWith({ equity_usd: null }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['Q']);
  });

  it('names several nulls together in R,E,I,D,A,Q order', () => {
    const e = errorOf(firmWith({ total_assets_usd: null, revenue_usd: null, ebit_usd: null }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['R', 'E', 'A']);
  });

  it('treats a NaN input as unusable', () => {
    const e = errorOf(firmWith({ ebit_usd: Number.NaN }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['E']);
    expect(e.message).toContain('unusable');
  });

  it('D = 0 is not rescuable, never debt-free', () => {
    const e = errorOf(firmWith({ total_debt_usd: 0 }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['D']);
  });

  it('D < 0 is not rescuable', () => {
    const e = errorOf(firmWith({ total_debt_usd: -5 }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['D']);
  });

  it('R <= 0 is not rescuable', () => {
    expect(errorOf(firmWith({ revenue_usd: 0 })).detail?.inputs).toEqual(['R']);
    expect(errorOf(firmWith({ revenue_usd: -1 })).detail?.inputs).toEqual(['R']);
  });

  it('I <= 0 is not rescuable', () => {
    expect(errorOf(firmWith({ interest_expense_usd: 0 })).detail?.inputs).toEqual(['I']);
    expect(errorOf(firmWith({ interest_expense_usd: -1 })).detail?.inputs).toEqual(['I']);
  });

  it('names several unusable inputs together', () => {
    const e = errorOf(firmWith({ revenue_usd: 0, interest_expense_usd: 0, total_debt_usd: 0 }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['D', 'R', 'I']);
  });

  it('Property 18 counterexample: sub-dollar EBIT is not_rescuable', () => {
    const e = errorOf(
      firmWith({
        revenue_usd: 1e6,
        ebit_usd: 4.940656e-318,
        interest_expense_usd: 500,
        total_debt_usd: 1e5,
        total_assets_usd: 0,
        equity_usd: 0,
      }),
      0,
      macroWith(0),
    );
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['E']);
  });

  it('sub-dollar interest 0.5 names I', () => {
    const e = errorOf(firmWith({ interest_expense_usd: 0.5 }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['I']);
  });

  it('sub-dollar negative equity -0.5 names Q', () => {
    const e = errorOf(firmWith({ equity_usd: -0.5 }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['Q']);
  });

  it('sign checks win over the sub-dollar check, which wins over b', () => {
    expect(errorOf(firmWith({ total_debt_usd: 0, equity_usd: 0.5 })).detail?.inputs).toEqual(['D']);
    expect(errorOf(firmWith({ equity_usd: 0.5 }), 0.01, macroWith(-1)).detail?.inputs).toEqual([
      'Q',
    ]);
  });

  it('empty years reports years', () => {
    const f = structuredClone(ashgroveWorks);
    f.years = [];
    const e = errorOf(f);
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['years']);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.01])(
    'unusable b = %s',
    (b) => {
      const e = errorOf(structuredClone(ashgroveWorks), 0.01, macroWith(b));
      expect(e.code).toBe('not_rescuable');
      expect(e.detail?.inputs).toEqual(['b']);
    },
  );

  it('accepts b = 0', () => {
    expect(prepare(structuredClone(ashgroveWorks), 0, macroWith(0)).ok).toBe(true);
  });

  it('reports a firm defect before a b defect', () => {
    const e = errorOf(firmWith({ revenue_usd: null }), 0.01, macroWith(Number.NaN));
    expect(e.detail?.inputs).toEqual(['R']);
  });
});

describe('prepare: rescue_inputs (Req 4.16)', () => {
  function withRi(patch: Record<string, unknown>): Firm {
    const f = structuredClone(ashgroveWorks);
    Object.assign(f.rescue_inputs, patch);
    return f;
  }

  it('missing rescue_inputs is not_rescuable and does not throw', () => {
    const f = structuredClone(ashgroveWorks) as unknown as Record<string, unknown>;
    delete f['rescue_inputs'];
    const e = errorOf(f as unknown as Firm);
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['rescue_inputs']);
  });

  it('NaN margin_mean names margin_mean', () => {
    const e = errorOf(withRi({ margin_mean: Number.NaN }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['margin_mean']);
  });

  it('Infinity margin_change_sd names margin_change_sd', () => {
    const e = errorOf(withRi({ margin_change_sd: Number.POSITIVE_INFINITY }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['margin_change_sd']);
  });

  it('null revenue_growth_median names revenue_growth_median', () => {
    const e = errorOf(withRi({ revenue_growth_median: null }));
    expect(e.code).toBe('not_rescuable');
    expect(e.detail?.inputs).toEqual(['revenue_growth_median']);
  });

  it('names several bad fields in order, after money checks and before b', () => {
    const f = withRi({ margin_mean: Number.NaN, revenue_growth_median: Number.NaN });
    expect(errorOf(f, 0.01, macroWith(Number.NaN)).detail?.inputs).toEqual([
      'margin_mean',
      'revenue_growth_median',
    ]);
    const g = withRi({ margin_mean: Number.NaN });
    const last = g.years[g.years.length - 1] as FirmYear;
    last.equity_usd = null;
    expect(errorOf(g).detail?.inputs).toEqual(['Q']);
  });
});

describe('prepare: delta_out_of_range', () => {
  it.each([-0.01, 0.0500001, Number.NaN])('rejects %s without clamping', (d) => {
    const e = errorOf(structuredClone(ashgroveWorks), d);
    expect(e.code).toBe('delta_out_of_range');
    expect(Object.is(e.detail?.value, d)).toBe(true);
  });

  it('reports delta before firm defects', () => {
    const f = firmWith({ revenue_usd: null });
    expect(errorOf(f, -0.01).code).toBe('delta_out_of_range');
  });
});

describe('prepare: clamps', () => {
  function withRescue(patch: Partial<Firm['rescue_inputs']>): Firm {
    const f = structuredClone(ashgroveWorks);
    Object.assign(f.rescue_inputs, patch);
    return f;
  }
  function value(f: Firm) {
    const res = prepare(f, 0, fixtureMacro);
    if (!res.ok) throw new Error('expected ok');
    return res.value;
  }

  it('clamps sigma at both ends', () => {
    expect(value(withRescue({ margin_change_sd: 0.001 })).sigma).toBe(0.01);
    expect(value(withRescue({ margin_change_sd: 0.5 })).sigma).toBe(0.08);
    expect(value(withRescue({ margin_change_sd: 0.03 })).sigma).toBe(0.03);
  });

  it('clamps g at both ends', () => {
    expect(value(withRescue({ revenue_growth_median: -0.4 })).g).toBe(-0.15);
    expect(value(withRescue({ revenue_growth_median: 0.4 })).g).toBe(0.15);
    expect(value(withRescue({ revenue_growth_median: 0.02 })).g).toBe(0.02);
  });
});
