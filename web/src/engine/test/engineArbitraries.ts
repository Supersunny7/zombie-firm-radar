import fc from 'fast-check';
import type { Firm, FirmStatus, FirmYear, Macro } from '../../types/data';
import type { InputName } from '../errors';
import type { ToolChoice, Treatment, V1ToolName } from '../types';

/** Full inclusive ranges of the four v1 tools (rescue-rules.md). */
const RANGE = {
  c: { min: 0, max: 0.08 },
  s: { min: 0, max: 0.3 },
  w: { min: 0, max: 0.6 },
} as const;

const V1_NAMES: readonly V1ToolName[] = [
  'cut_costs',
  'sell_assets',
  'debt_for_equity',
  'refinance',
];

/** A value over [min, max] with both endpoints drawn as constants. */
function arbParam(min: number, max: number): fc.Arbitrary<number> {
  return fc.oneof(
    { weight: 1, arbitrary: fc.constant(min) },
    { weight: 1, arbitrary: fc.constant(max) },
    { weight: 6, arbitrary: fc.double({ min, max, noNaN: true, noDefaultInfinity: true }) },
  );
}

function arbTool(name: V1ToolName): fc.Arbitrary<ToolChoice> {
  switch (name) {
    case 'cut_costs':
      return arbParam(RANGE.c.min, RANGE.c.max).map((c) => ({ name, params: { c } }));
    case 'sell_assets':
      return arbParam(RANGE.s.min, RANGE.s.max).map((s) => ({ name, params: { s } }));
    case 'debt_for_equity':
      return arbParam(RANGE.w.min, RANGE.w.max).map((w) => ({ name, params: { w } }));
    case 'refinance':
      return fc.constant({ name, params: {} });
  }
}

/**
 * Valid Treatment: 0 to 3 distinct v1 tools in random click order, parameters
 * over their full inclusive ranges (endpoints as constants).
 */
export const arbTreatment: fc.Arbitrary<Treatment> = fc
  .shuffledSubarray([...V1_NAMES], { minLength: 0, maxLength: 3 })
  .chain((names) => fc.tuple(...names.map(arbTool)))
  .map((tools): Treatment => tools);

export type BadTreatmentKind =
  | 'unknown_tool'
  | 'too_many_tools'
  | 'duplicate_tool'
  | 'out_of_range'
  | 'not_a_number'
  | 'infinite'
  | 'non_number'
  | 'missing_key'
  | 'extra_key'
  | 'refinance_key'
  | 'non_array'
  | 'malformed_entry';

export interface BadTreatment {
  /** The corrupted value, passed to the parser as `unknown`. */
  readonly value: unknown;
  /** Corruptions applied, in application order (non_array always last). */
  readonly corruptions: readonly BadTreatmentKind[];
}

const BAD_KINDS: readonly BadTreatmentKind[] = [
  'unknown_tool',
  'too_many_tools',
  'duplicate_tool',
  'out_of_range',
  'not_a_number',
  'infinite',
  'non_number',
  'missing_key',
  'extra_key',
  'refinance_key',
  'non_array',
  'malformed_entry',
];

interface Op {
  readonly kind: BadTreatmentKind;
  readonly pick: number;
  readonly val: number;
}

type Entry = { name?: unknown; params?: Record<string, unknown> | undefined } & Record<
  string,
  unknown
>;

const PARAM_KEY: Readonly<Record<string, 'c' | 's' | 'w'>> = {
  cut_costs: 'c',
  sell_assets: 's',
  debt_for_equity: 'w',
};

const UNKNOWN_NAMES = ['issue_equity', 'chapter_11', 'liquidate', 'nope', '', 'Cut_Costs'];
const NON_NUMBERS: readonly unknown[] = ['0.05', null, undefined, true, {}, [], 1n];
const NON_ARRAYS: readonly unknown[] = [undefined, null, {}, 'cut_costs', 5, { length: 0 }, true];
const MALFORMED: readonly unknown[] = [null, 5, 'cut_costs', [], { params: {} }, { name: 5 }];

/** Param key of a well-formed v1 entry with a numeric param, else undefined. */
function paramKeyOf(e: unknown): 'c' | 's' | 'w' | undefined {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return undefined;
  const name = (e as Entry).name;
  return typeof name === 'string' && Object.hasOwn(PARAM_KEY, name) ? PARAM_KEY[name] : undefined;
}

const at = <T>(xs: readonly T[], i: number): T => xs[i % xs.length] as T;

function validEntry(name: V1ToolName, v: number): Entry {
  const key = PARAM_KEY[name];
  return key ? { name, params: { [key]: v } } : { name, params: {} };
}

/** Index of an entry with a numeric parameter, appending a cut_costs entry if none exists. */
function ensureParamEntry(arr: unknown[], pick: number): number {
  const idx = arr
    .map((e, i) => [e, i] as const)
    .filter(([e]) => paramKeyOf(e) !== undefined)
    .map(([, i]) => i);
  if (idx.length > 0) return at(idx, pick);
  arr.push(validEntry('cut_costs', 0.04));
  return arr.length - 1;
}

function apply(arr: unknown[], op: Op): void {
  switch (op.kind) {
    case 'unknown_tool': {
      const name = at(UNKNOWN_NAMES, op.val);
      if (arr.length === 0) arr.push({ name, params: {} });
      else arr[op.pick % arr.length] = { name, params: {} };
      return;
    }
    case 'too_many_tools': {
      const target = 4 + (op.val % 3);
      while (arr.length < target) arr.push(validEntry(at(V1_NAMES, arr.length + op.pick), 0.01));
      return;
    }
    case 'duplicate_tool': {
      if (arr.length === 0) arr.push(validEntry('refinance', 0));
      arr.push(structuredClone(at(arr, op.pick)));
      return;
    }
    case 'out_of_range': {
      const i = ensureParamEntry(arr, op.pick);
      const e = arr[i] as Entry;
      const key = paramKeyOf(e) as 'c' | 's' | 'w';
      const max = RANGE[key].max;
      const bad = [-1e-9, -0.5, max * 1.0000001, max + 0.01, 1, 100];
      e.params = { ...e.params, [key]: at(bad, op.val) };
      return;
    }
    case 'not_a_number':
    case 'infinite': {
      const i = ensureParamEntry(arr, op.pick);
      const e = arr[i] as Entry;
      const key = paramKeyOf(e) as 'c' | 's' | 'w';
      const bad = op.kind === 'not_a_number' ? [Number.NaN] : [Infinity, -Infinity];
      e.params = { ...e.params, [key]: at(bad, op.val) };
      return;
    }
    case 'non_number': {
      const i = ensureParamEntry(arr, op.pick);
      const e = arr[i] as Entry;
      const key = paramKeyOf(e) as 'c' | 's' | 'w';
      e.params = { ...e.params, [key]: at(NON_NUMBERS, op.val) };
      return;
    }
    case 'missing_key': {
      const i = ensureParamEntry(arr, op.pick);
      const e = arr[i] as Entry;
      if (op.val % 2 === 0) e.params = {};
      else delete e.params;
      return;
    }
    case 'extra_key': {
      const i = ensureParamEntry(arr, op.pick);
      const e = arr[i] as Entry;
      e.params = { ...e.params, extra: 0.01 };
      return;
    }
    case 'refinance_key': {
      let i = arr.findIndex((e) => (e as Entry | null)?.name === 'refinance');
      if (i < 0) {
        arr.push(validEntry('refinance', 0));
        i = arr.length - 1;
      }
      const key = at(['c', 's', 'w', 'x'], op.val);
      (arr[i] as Entry).params = { [key]: 0.01 };
      return;
    }
    case 'malformed_entry': {
      const bad = at(MALFORMED, op.val);
      if (arr.length === 0) arr.push(bad);
      else arr[op.pick % arr.length] = bad;
      return;
    }
    case 'non_array':
      return; // handled by the caller, always last
  }
}

const arbOp: fc.Arbitrary<Op> = fc.record({
  kind: fc.constantFrom(...BAD_KINDS),
  pick: fc.nat({ max: 1000 }),
  val: fc.nat({ max: 1000 }),
});

/**
 * One to three distinct corruptions applied on top of a valid Treatment. The
 * expected error code is intentionally not given: tests derive it with an
 * independent classifier from `value`. `non_array` replaces the whole value last.
 */
export const arbBadTreatment: fc.Arbitrary<BadTreatment> = fc
  .tuple(
    arbTreatment,
    fc.uniqueArray(arbOp, { minLength: 1, maxLength: 3, selector: (o) => o.kind }),
  )
  .map(([base, ops]) => {
    // Start from a plain, mutable deep copy so the valid base is never touched.
    const arr: unknown[] = structuredClone(base) as unknown[];
    const ordered = [...ops].sort(
      (a, b) => Number(a.kind === 'non_array') - Number(b.kind === 'non_array'),
    );
    for (const op of ordered) apply(arr, op);
    const nonArray = ops.find((o) => o.kind === 'non_array');
    const value: unknown = nonArray ? at(NON_ARRAYS, nonArray.val) : arr;
    return { value, corruptions: ordered.map((o) => o.kind) };
  });

// ---------------------------------------------------------------------------
// Firm, macro and delta generators
// ---------------------------------------------------------------------------

const STATUSES: readonly FirmStatus[] = ['zombie', 'endangered', 'healthy', 'insufficient_data'];

/** Money-like double in [min, max] with both endpoints drawn as constants. */
const arbRange = (min: number, max: number): fc.Arbitrary<number> => arbParam(min, max);

interface LatestFigures {
  readonly R: number;
  readonly E: number;
  readonly I: number;
  readonly D: number;
  readonly A: number;
  readonly Q: number;
}

/** Latest-year figures over the design-table domains. */
const arbLatest: fc.Arbitrary<LatestFigures> = fc
  .record({
    R: arbRange(1e6, 1e11),
    margin: arbRange(-0.3, 0.3),
    D: arbRange(1e5, 1e11),
    rate: arbRange(0.005, 0.25),
    aSmall: arbRange(0, 1e11),
    // Sale clears all debt: A * 0.30 * 0.6 >= D (min recovery is 0.6).
    aFactor: fc.double({ min: 1.001, max: 3, noNaN: true, noDefaultInfinity: true }),
    aLarge: fc.boolean(),
    Q: arbRange(-1e10, 1e10),
  })
  .map(({ R, margin, D, rate, aSmall, aFactor, aLarge, Q }) => ({
    R,
    E: R * margin,
    I: D * rate,
    D,
    A: aLarge ? (D / (0.3 * 0.6)) * aFactor : aSmall,
    Q,
  }));

function yearOf(fy: number, f: Record<keyof LatestFigures, number | null>): FirmYear {
  const hasIcr = f.E !== null && f.I !== null && f.I > 0;
  return {
    fy,
    revenue_usd: f.R,
    ebit_usd: f.E,
    interest_expense_usd: f.I,
    total_debt_usd: f.D,
    total_assets_usd: f.A,
    equity_usd: f.Q,
    icr: hasIcr ? (f.E as number) / (f.I as number) : null,
    ebit_tag: f.E === null ? null : 'OperatingIncomeLoss',
    revenue_tag: f.R === null ? null : 'Revenues',
    debt_tags: f.D === null ? [] : ['LongTermDebtNoncurrent'],
  };
}

const arbNullable = (min: number, max: number): fc.Arbitrary<number | null> =>
  fc.option(arbRange(min, max), { nil: null, freq: 4 });

/** An earlier year: any figure may be null, so only the latest year can matter. */
const arbOlderFigures: fc.Arbitrary<Record<keyof LatestFigures, number | null>> = fc.record({
  R: arbNullable(1e6, 1e11),
  E: arbNullable(-3e10, 3e10),
  I: arbNullable(0, 2.5e10),
  D: arbNullable(0, 1e11),
  A: arbNullable(0, 1e11),
  Q: arbNullable(-1e10, 1e10),
});

/**
 * Valid Firm (full data.ts shape): 1 to 5 years in shuffled order, latest year
 * (highest `fy`) has every figure the engine needs. E and Q may be <= 0; some
 * firms have A large enough that selling assets can repay all debt.
 */
export const arbValidFirm: fc.Arbitrary<Firm> = fc
  .record({
    n: fc.integer({ min: 1, max: 5 }),
    latestFy: fc.integer({ min: 2005, max: 2040 }),
  })
  .chain(({ n, latestFy }) =>
    fc.record({
      latestFy: fc.constant(latestFy),
      latest: arbLatest,
      olders: fc.array(arbOlderFigures, { minLength: n - 1, maxLength: n - 1 }),
      ri: fc.record({
        margin_mean: arbRange(-0.2, 0.3),
        margin_change_mean: arbRange(-0.02, 0.02),
        margin_change_sd: arbRange(0, 0.2),
        revenue_growth_median: arbRange(-0.3, 0.3),
        used_sector_fallback: fc.boolean(),
      }),
      status: fc.constantFrom(...STATUSES),
      ticker: fc.constantFrom<string | null>(null, 'HLMR'),
    }),
  )
  .chain(({ latestFy, latest, olders, ri, status, ticker }) => {
    const years: FirmYear[] = [
      yearOf(latestFy, latest),
      ...olders.map((f, i) => yearOf(latestFy - 1 - i, f)),
    ];
    return fc
      .shuffledSubarray(years, { minLength: years.length, maxLength: years.length })
      .map((shuffled): Firm => ({
        cik: '0000012345',
        name: 'Hollowmere Foundry Co',
        ticker,
        sector: 'Manufacturing',
        status,
        reasons: ['Fictional test firm.'],
        as_of_filing: { fiscal_year: latestFy, filed: `${latestFy + 1}-03-01`, form: '10-K' },
        years: shuffled,
        rescue_inputs: { ...ri, history_years: years.length },
      }));
  });

function macroOf(b: number): Macro {
  return {
    dgs10: { value: b, date: '2025-01-15', source: 'FRED DGS10' },
    sector_medians: {
      Manufacturing: {
        margin_mean: 0.05,
        margin_change_mean: 0,
        margin_change_sd: 0.02,
        revenue_growth_median: 0.01,
      },
    },
  };
}

/** Valid Macro: b = dgs10.value in [0, 0.08], endpoints as constants. */
export const arbMacroValid: fc.Arbitrary<Macro> = arbRange(0, 0.08).map(macroOf);

/** Valid rate shock: [0, 0.05] plus the constants 0 and 0.05. */
export const arbDelta: fc.Arbitrary<number> = arbRange(0, 0.05);

// --- Bad generators, each labelled with the expected error code and inputs ---

export interface BadDelta {
  /** Passed as `unknown`; never a finite number in [0, 0.05]. */
  readonly delta: unknown;
  readonly code: 'delta_out_of_range';
}

export const arbBadDelta: fc.Arbitrary<BadDelta> = fc
  .oneof(
    fc.constantFrom<unknown>(
      Number.NaN,
      Infinity,
      -Infinity,
      -1e-9,
      0.05000001,
      '0.01',
      null,
      undefined,
      true,
      {},
    ),
    fc.double({ min: -1, max: -Number.MIN_VALUE, noNaN: true }),
    fc.double({ min: 0.0500001, max: 10, noNaN: true }),
  )
  .map((delta) => ({ delta, code: 'delta_out_of_range' as const }));

export interface BadMacro {
  /** Valid except for `dgs10.value`. Use with a valid firm and valid delta. */
  readonly macro: Macro;
  readonly code: 'not_rescuable';
  readonly inputs: readonly ['b'];
}

export const arbBadMacro: fc.Arbitrary<BadMacro> = fc
  .oneof(
    fc.constantFrom<unknown>(
      -1e-9,
      -0.01,
      -1,
      Number.NaN,
      Infinity,
      -Infinity,
      '0.04',
      null,
      undefined,
    ),
    fc.double({ min: -1, max: -Number.MIN_VALUE, noNaN: true }),
  )
  .map((b) => ({
    macro: macroOf(b as number),
    code: 'not_rescuable' as const,
    inputs: ['b'] as const,
  }));

export interface BadFirm {
  /** A valid firm with a defective latest year (or no years). */
  readonly firm: Firm;
  readonly code: 'not_rescuable';
  /**
   * Inputs prepare() must name: every null of R, E, I, D, A, Q in that order;
   * if none is null, the unusable ones of D, R, I in that order; `['years']`
   * when `years` is empty.
   */
  readonly inputs: readonly InputName[];
}

const NULLABLE_ORDER: readonly InputName[] = ['R', 'E', 'I', 'D', 'A', 'Q'];
const UNUSABLE_ORDER: readonly InputName[] = ['D', 'R', 'I'];
const FIELD: Readonly<Record<string, keyof FirmYear>> = {
  R: 'revenue_usd',
  E: 'ebit_usd',
  I: 'interest_expense_usd',
  D: 'total_debt_usd',
  A: 'total_assets_usd',
  Q: 'equity_usd',
};
const UNUSABLE_VALUES = [0, -0, -1, -1e6, -1e11] as const;

export const arbBadFirm: fc.Arbitrary<BadFirm> = fc.oneof(
  {
    weight: 1,
    arbitrary: arbValidFirm.map((f): BadFirm => ({
      firm: { ...f, years: [] },
      code: 'not_rescuable',
      inputs: ['years'],
    })),
  },
  {
    weight: 6,
    arbitrary: fc
      .tuple(
        arbValidFirm,
        fc.subarray([...NULLABLE_ORDER]),
        fc.subarray([...UNUSABLE_ORDER]),
        fc.array(fc.nat({ max: UNUSABLE_VALUES.length - 1 }), { minLength: 3, maxLength: 3 }),
      )
      .filter(([, nulls, unusable]) => nulls.length + unusable.length > 0)
      .map(([firm, nulls, unusable, picks]): BadFirm => {
        const latest = firm.years.reduce((a, y) => (y.fy > a.fy ? y : a));
        const patched: Record<string, unknown> = { ...latest };
        unusable.forEach((n, i) => {
          patched[FIELD[n] as string] = UNUSABLE_VALUES[picks[i] as number];
        });
        for (const n of nulls) patched[FIELD[n] as string] = null;
        const years = firm.years.map((y) => (y === latest ? (patched as unknown as FirmYear) : y));
        const inputs =
          nulls.length > 0
            ? NULLABLE_ORDER.filter((n) => nulls.includes(n))
            : UNUSABLE_ORDER.filter((n) => unusable.includes(n));
        return { firm: { ...firm, years }, code: 'not_rescuable', inputs };
      }),
  },
);
