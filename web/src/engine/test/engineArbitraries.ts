import fc from 'fast-check';
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
