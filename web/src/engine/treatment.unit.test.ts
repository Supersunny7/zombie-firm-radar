import { describe, expect, it } from 'vitest';
import { TOOL_REGISTRY } from './tools';
import { deserialiseTreatment, parseTreatment, serialiseTreatment } from './treatment';
import type { Treatment } from './types';

function errorOf(input: unknown) {
  const r = parseTreatment(input);
  if (r.ok) throw new Error('expected parse failure');
  return r.error;
}

function valueOf(input: unknown) {
  const r = parseTreatment(input);
  if (!r.ok) throw new Error(`expected success, got ${r.error.code}`);
  return r.value;
}

describe('parseTreatment errors', () => {
  it('invalid_treatment: input is not an array', () => {
    expect(errorOf('cut_costs')).toEqual({
      code: 'invalid_treatment',
      message: 'Treatment must be a list of tools.',
      detail: { value: 'cut_costs' },
    });
  });

  it('invalid_treatment: malformed entry carries its index', () => {
    expect(errorOf([{ name: 'refinance' }, 42])).toEqual({
      code: 'invalid_treatment',
      message: 'Tool 2 must be an object with a text name.',
      detail: { index: 1, value: 42 },
    });
    expect(errorOf([{ name: 7 }]).detail).toEqual({ index: 0, value: { name: 7 } });
  });

  it('too_many_tools: more than 3 entries', () => {
    const four = [
      { name: 'cut_costs', params: { c: 0.01 } },
      { name: 'sell_assets', params: { s: 0.1 } },
      { name: 'debt_for_equity', params: { w: 0.1 } },
      { name: 'refinance' },
    ];
    expect(errorOf(four)).toEqual({
      code: 'too_many_tools',
      message: 'A treatment can use at most 3 tools, got 4.',
      detail: { value: 4 },
    });
  });

  it('unknown_tool: names the offending tool and its index', () => {
    expect(errorOf([{ name: 'refinance' }, { name: 'magic' }])).toEqual({
      code: 'unknown_tool',
      message:
        'Unknown tool "magic". Available tools: cut_costs, sell_assets, debt_for_equity, refinance.',
      detail: { tool: 'magic', index: 1 },
    });
  });

  it('duplicate_tool: same tool twice', () => {
    expect(
      errorOf([
        { name: 'cut_costs', params: { c: 0.01 } },
        { name: 'cut_costs', params: { c: 0.02 } },
      ]),
    ).toEqual({
      code: 'duplicate_tool',
      message: 'Each tool can be used only once, but "cut_costs" appears twice.',
      detail: { tool: 'cut_costs' },
    });
  });

  it('param_out_of_range: value above the range', () => {
    expect(errorOf([{ name: 'cut_costs', params: { c: 0.09 } }])).toEqual({
      code: 'param_out_of_range',
      message: 'cut_costs needs c between 0 and 0.08.',
      detail: { tool: 'cut_costs', param: 'c', value: 0.09 },
    });
  });

  it('param_out_of_range: missing key, NaN, wrong type and negative', () => {
    expect(errorOf([{ name: 'sell_assets', params: {} }])).toEqual({
      code: 'param_out_of_range',
      message: 'sell_assets needs s between 0 and 0.3.',
      detail: { tool: 'sell_assets', param: 's', value: undefined },
    });
    expect(errorOf([{ name: 'sell_assets' }]).code).toBe('param_out_of_range');
    expect(errorOf([{ name: 'debt_for_equity', params: { w: Number.NaN } }]).code).toBe(
      'param_out_of_range',
    );
    expect(errorOf([{ name: 'debt_for_equity', params: { w: '0.1' } }]).code).toBe(
      'param_out_of_range',
    );
    expect(errorOf([{ name: 'sell_assets', params: { s: -0.01 } }]).detail?.param).toBe('s');
  });

  it('param_out_of_range: extra key on a parametrised tool', () => {
    expect(errorOf([{ name: 'cut_costs', params: { c: 0.05, x: 1 } }])).toEqual({
      code: 'param_out_of_range',
      message: 'cut_costs does not take the parameter "x".',
      detail: { tool: 'cut_costs', param: 'x', value: 1 },
    });
  });

  it('refinance: any key is rejected', () => {
    expect(errorOf([{ name: 'refinance', params: { on: true } }])).toEqual({
      code: 'param_out_of_range',
      message: 'refinance does not take the parameter "on".',
      detail: { tool: 'refinance', param: 'on', value: true },
    });
  });

  it('reports the first violation in the fixed order', () => {
    // duplicate and bad param: duplicate wins; unknown beats duplicate
    expect(
      errorOf([
        { name: 'cut_costs', params: { c: 9 } },
        { name: 'cut_costs', params: { c: 9 } },
      ]).code,
    ).toBe('duplicate_tool');
    expect(errorOf([{ name: 'x' }, { name: 'x' }]).code).toBe('unknown_tool');
  });
});

describe('parseTreatment successes', () => {
  it('accepts an empty Treatment', () => {
    expect(valueOf([])).toEqual([]);
  });

  it('accepts refinance with absent params and with {}', () => {
    expect(valueOf([{ name: 'refinance' }])).toEqual([{ name: 'refinance', params: {} }]);
    expect(valueOf([{ name: 'refinance', params: {} }])).toEqual([
      { name: 'refinance', params: {} },
    ]);
  });

  it('accepts both endpoints of every range', () => {
    const lo = [
      { name: 'cut_costs', params: { c: 0 } },
      { name: 'sell_assets', params: { s: 0 } },
      { name: 'debt_for_equity', params: { w: 0 } },
    ];
    const hi = [
      { name: 'cut_costs', params: { c: 0.08 } },
      { name: 'sell_assets', params: { s: 0.3 } },
      { name: 'debt_for_equity', params: { w: 0.6 } },
    ];
    expect(valueOf(lo)).toEqual(lo);
    expect(valueOf(hi)).toEqual(hi);
  });

  it('returns canonical order for a reversed input', () => {
    const reversed = [
      { name: 'refinance' },
      { name: 'debt_for_equity', params: { w: 0.3 } },
      { name: 'cut_costs', params: { c: 0.05 } },
    ];
    expect(valueOf(reversed).map((t) => t.name)).toEqual([
      'cut_costs',
      'debt_for_equity',
      'refinance',
    ]);
  });

  it('normalises -0 to 0', () => {
    const t = valueOf([{ name: 'cut_costs', params: { c: -0 } }]);
    expect(Object.is((t[0]?.params as { c: number }).c, 0)).toBe(true);
  });

  it('does not mutate the input and returns fresh objects', () => {
    const input = [
      { name: 'refinance', params: {} },
      { name: 'sell_assets', params: { s: -0 } },
    ];
    const before = structuredClone(input);
    const out = valueOf(input);
    expect(input).toEqual(before);
    expect(Object.is((input[1]?.params as { s: number }).s, -0)).toBe(true);
    expect(out[0]).not.toBe(input[1]);
    expect(out[1]?.params).not.toBe(input[0]?.params);
  });

  it('leaves the input unmodified on failure', () => {
    const input = [{ name: 'cut_costs', params: { c: 5 } }, { name: 'nope' }];
    const before = structuredClone(input);
    parseTreatment(input);
    expect(input).toEqual(before);
  });
});

describe('tool registry', () => {
  it.each(['issue_equity', 'chapter_11', 'liquidate'])(
    '%s is an extension tool rejected as unknown_tool',
    (name) => {
      const spec = TOOL_REGISTRY.find((s) => s.name === name);
      expect(spec?.status).toBe('extension');
      const err = errorOf([{ name, params: {} }]);
      expect(err.code).toBe('unknown_tool');
      expect(err.detail?.tool).toBe(name);
      expect(err.message).toContain(`"${name}"`);
    },
  );

  it('lists the four v1 tools first, in canonical order', () => {
    const v1 = TOOL_REGISTRY.filter((s) => s.status === 'v1').map((s) => s.name);
    expect(v1).toEqual(['cut_costs', 'sell_assets', 'debt_for_equity', 'refinance']);
    expect(TOOL_REGISTRY.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('serialisation examples', () => {
  const cases: [string, unknown[], string][] = [
    ['empty', [], ''],
    [
      'cut then refinance',
      [{ name: 'refinance' }, { name: 'cut_costs', params: { c: 0.05 } }],
      'cut_costs,c=0.05;refinance',
    ],
    [
      'sell before swap',
      [
        { name: 'debt_for_equity', params: { w: 0.3 } },
        { name: 'sell_assets', params: { s: 0.2 } },
      ],
      'sell_assets,s=0.2;debt_for_equity,w=0.3',
    ],
  ];

  it.each(cases)('%s', (_label, input, expected) => {
    const t: Treatment = valueOf(input);
    expect(serialiseTreatment(t)).toBe(expected);
    expect(deserialiseTreatment(expected)).toEqual({ ok: true, value: t });
  });
});
