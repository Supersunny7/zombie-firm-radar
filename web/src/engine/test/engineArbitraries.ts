import fc from 'fast-check';
import type { Firm, FirmStatus, FirmYear, Macro } from '../../types/data';
import type { InputName } from '../errors';
import type { RandomBlock } from '../rng';
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

// ---------------------------------------------------------------------------
// Randomness, seed, date and CIK generators
// ---------------------------------------------------------------------------

/** One Path's random numbers: recovery, haircut and six-sigma-bounded normals. */
export const arbBlock: fc.Arbitrary<RandomBlock> = fc.record({
  recovery: arbParam(0.6, 0.8),
  haircut: arbParam(0.3, 0.6),
  eps: fc.tuple(arbParam(-6.7, 6.7), arbParam(-6.7, 6.7), arbParam(-6.7, 6.7)),
});

/** One case of the RR-2 domain (Req 13.3, Property 12). */
export interface Rr2Case {
  readonly firm: Firm;
  readonly macro: Macro;
  readonly delta: number;
  /** eps1..eps3 in [-4, 4]; recovery in [0.6, 0.8]; haircut in [0.3, 0.6]. */
  readonly block: RandomBlock;
  /** Distinct tools drawn from sell_assets, debt_for_equity and refinance; no cut_costs. */
  readonly baseTreatment: Treatment;
}

const RR2_NAMES: readonly V1ToolName[] = ['sell_assets', 'debt_for_equity', 'refinance'];
const RR2_A_MAX = 1e11;

/** arbValidFirm with the latest-year assets capped to the RR-2 domain A in [0, 1e11]. */
const arbRr2Firm: fc.Arbitrary<Firm> = arbValidFirm.map((firm): Firm => {
  const latest = firm.years.reduce((a, y) => (y.fy > a.fy ? y : a));
  const a = latest.total_assets_usd;
  if (a === null || a <= RR2_A_MAX) return firm;
  return {
    ...firm,
    years: firm.years.map((y) => (y === latest ? { ...y, total_assets_usd: RR2_A_MAX } : y)),
  };
});

/**
 * RR-2 domain of Req 13.3 (Property 12): firm with E/R in [-0.3, 0.3], margin_mean in
 * [-0.2, 0.3], R, D, r, A, Q, sigma and g ranges as in the requirement; macro with b in
 * [0, 0.08]; delta in [0, 0.05]; a block with eps in [-4, 4]; and a base treatment of
 * 0 to 3 distinct tools from sell_assets, debt_for_equity and refinance (the property sets cut_costs).
 */
export const arbRr2Case: fc.Arbitrary<Rr2Case> = fc.record({
  firm: arbRr2Firm,
  macro: arbMacroValid,
  delta: arbDelta,
  block: fc.record({
    recovery: arbParam(0.6, 0.8),
    haircut: arbParam(0.3, 0.6),
    eps: fc.tuple(arbParam(-4, 4), arbParam(-4, 4), arbParam(-4, 4)),
  }),
  baseTreatment: fc
    .shuffledSubarray([...RR2_NAMES], { minLength: 0, maxLength: 3 })
    .chain((names) => fc.tuple(...names.map(arbTool)))
    .map((tools): Treatment => tools),
});

/** Valid seed: unsigned 32-bit integer. */
export const arbSeed: fc.Arbitrary<number> = fc.oneof(
  { weight: 1, arbitrary: fc.constantFrom(0, 1, 4294967295) },
  { weight: 6, arbitrary: fc.integer({ min: 0, max: 4294967295 }) },
);

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const isLeap = (y: number): boolean => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const pad = (n: number, w: number): string => String(n).padStart(w, '0');
const daysIn = (y: number, m: number): number => (m === 2 && isLeap(y) ? 29 : (DAYS[m - 1] ?? 0));

/** Valid ISO calendar date YYYY-MM-DD from 1900-01-01 to 2199-12-31 (Gregorian leap rules). */
export const arbIsoDate: fc.Arbitrary<string> = fc
  .record({
    y: fc.integer({ min: 1900, max: 2199 }),
    m: fc.integer({ min: 1, max: 12 }),
    d: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ y, m, d }) => `${pad(y, 4)}-${pad(m, 2)}-${pad(Math.min(d, daysIn(y, m)), 2)}`);

/** Valid CIK: exactly 10 digits (leading zeros allowed). */
export const arbCik: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'0123456789'.split('')), { minLength: 10, maxLength: 10 })
  .map((ds) => ds.join(''));

export interface BadPaths {
  /** Passed as `unknown`; never an integer in [1, 100000]. */
  readonly paths: unknown;
  readonly code: 'invalid_paths';
}

export const arbBadPaths: fc.Arbitrary<BadPaths> = fc
  .oneof(
    fc.constantFrom<unknown>(
      0,
      -0,
      -1,
      100001,
      1e9,
      0.5,
      1.5,
      Number.NaN,
      Infinity,
      -Infinity,
      '1000',
      null,
      undefined,
      true,
      {},
      [],
    ),
    fc.integer({ min: -1_000_000, max: 0 }),
    fc.integer({ min: 100001, max: 10_000_000 }),
    fc.double({ min: 0.001, max: 99999, noNaN: true }).filter((n) => !Number.isInteger(n)),
  )
  .map((paths) => ({ paths, code: 'invalid_paths' as const }));

export interface BadSeed {
  /** Passed as `unknown`; never an integer in [0, 4294967295]. */
  readonly seed: unknown;
  readonly code: 'invalid_seed';
}

export const arbBadSeed: fc.Arbitrary<BadSeed> = fc
  .oneof(
    fc.constantFrom<unknown>(
      -1,
      4294967296,
      0.5,
      Number.NaN,
      Infinity,
      -Infinity,
      '5',
      null,
      undefined,
      true,
      {},
      [],
      1n,
    ),
    fc.integer({ min: -2147483648, max: -1 }),
    fc.integer({ min: 4294967296, max: Number.MAX_SAFE_INTEGER }),
    fc.double({ min: 0.001, max: 4294967294, noNaN: true }).filter((n) => !Number.isInteger(n)),
  )
  .map((seed) => ({ seed, code: 'invalid_seed' as const }));

export interface BadCik {
  /** Passed as `unknown`; never a string of exactly 10 digits. */
  readonly cik: unknown;
  readonly code: 'invalid_cik';
}

const digits = (n: number): fc.Arbitrary<string> =>
  fc
    .array(fc.constantFrom(...'0123456789'.split('')), { minLength: n, maxLength: n })
    .map((ds) => ds.join(''));

export const arbBadCik: fc.Arbitrary<BadCik> = fc
  .oneof(
    fc.constantFrom<unknown>(
      '',
      '123',
      ' 000000123',
      '0000001234 ',
      'abcdefghij',
      '000000123x',
      '0000-01234',
      '１２３４５６７８９０',
      12345,
      1234567890,
      null,
      undefined,
      true,
      {},
      [],
    ),
    digits(9),
    digits(11),
    fc.integer({ min: 0, max: 9999999999 }),
  )
  .map((cik) => ({ cik, code: 'invalid_cik' as const }));

export interface BadDate {
  /** Passed as `unknown`; never a valid YYYY-MM-DD calendar date. */
  readonly date: unknown;
  readonly code: 'invalid_date';
}

const arbYear = fc.integer({ min: 1900, max: 2199 });
const arbNonLeapYear = arbYear.filter((y) => !isLeap(y));

export const arbBadDate: fc.Arbitrary<BadDate> = fc
  .oneof(
    // wrong format
    fc.constantFrom<unknown>(
      '',
      '2024-1-05',
      '2024-01-5',
      '24-01-05',
      '2024/01/05',
      '20240105',
      '2024-01-05T00:00:00Z',
      ' 2024-01-05',
      '2024-01-05 ',
      'yesterday',
      '2024-02-30',
      '2023-02-29',
      '1900-02-29',
      '2100-02-29',
      '2024-00-10',
      '2024-13-10',
      '2024-01-00',
      '2024-04-31',
      null,
      undefined,
      20240105,
      true,
      {},
      [],
      new Date(0),
    ),
    // month 00 or 13
    fc
      .tuple(arbYear, fc.constantFrom('00', '13'), fc.integer({ min: 1, max: 28 }))
      .map(([y, m, d]) => `${pad(y, 4)}-${m}-${pad(d, 2)}`),
    // day 00
    fc
      .tuple(arbYear, fc.integer({ min: 1, max: 12 }))
      .map(([y, m]) => `${pad(y, 4)}-${pad(m, 2)}-00`),
    // day 31 in a 30-day month
    fc.tuple(arbYear, fc.constantFrom(4, 6, 9, 11)).map(([y, m]) => `${pad(y, 4)}-${pad(m, 2)}-31`),
    // 29 February in a non-leap year
    arbNonLeapYear.map((y) => `${pad(y, 4)}-02-29`),
    // wrong separators or digit counts
    fc
      .tuple(fc.integer({ min: 100, max: 99999 }), fc.integer({ min: 1, max: 12 }))
      .filter(([y]) => String(y).length !== 4)
      .map(([y, m]) => `${y}-${pad(m, 2)}-01`),
  )
  .map((date) => ({ date, code: 'invalid_date' as const }));
