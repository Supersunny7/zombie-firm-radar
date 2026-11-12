/**
 * Shared fast-check arbitraries.
 *
 * - Game flow: arbCik, arbEvent, arbBadEvent.
 * - Settings: arbSettings.
 * - Data contract (built from src/types/data.ts, always accepted by src/data/guards.ts):
 *   arbStatus, arbFirmIndexEntry, arbFirmsIndex, arbFirm, arbMacro.
 * - arbCorruption(value): one single-field corruption of a valid JSON value, with the
 *   JSON path the guards must name when they reject it.
 */
import fc from 'fast-check';
import { arbTreatment } from '../engine/test/engineArbitraries';
import type { Settings } from '../state/settings';
import type { GameEvent } from '../state/types';
import type {
  Firm,
  FirmIndexEntry,
  FirmsIndex,
  FirmStatus,
  FirmYear,
  Macro,
  SectorMedians,
} from '../types/data';

/** Valid 10-digit zero-padded CIK string. */
export const arbCik = fc.stringMatching(/^\d{10}$/);

const arbResult = fc.constantFrom('revived', 'undead', 'liquidated');

const arbToolParams = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 8 }).filter((k) => k !== '__proto__'),
  fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.boolean()),
  { maxKeys: 4 },
);

/** Arbitrary `{ name, params }` tool; almost never engine-valid. Used for junk only. */
const arbRawTool = fc.record({
  name: fc.string({ minLength: 1, maxLength: 12 }),
  params: arbToolParams,
});

/** Valid rate shock: finite, 0 to 0.05 inclusive. */
const arbShock = fc.double({ min: 0, max: 0.05, noNaN: true });

/** Any valid event with a valid payload (it may still be invalid for the current state). */
export const arbEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  arbCik.map((cik): GameEvent => ({ type: 'selectFirm', cik })),
  fc.constant<GameEvent>({ type: 'captureDone' }),
  fc
    .record({ treatment: arbTreatment, result: arbResult })
    .map(({ treatment, result }): GameEvent => ({ type: 'pullSwitch', treatment, result })),
  fc.constant<GameEvent>({ type: 'continue' }),
  fc.constant<GameEvent>({ type: 'cancel' }),
  arbShock.map((value): GameEvent => ({ type: 'setRateShock', value })),
  arbTreatment.map((treatment): GameEvent => ({ type: 'setTreatment', treatment })),
  arbResult.map((result): GameEvent => ({ type: 'setResult', result })),
);

/** Arbitrary payload, including NaN, infinities, out-of-range numbers and junk. */
const arbJunk: fc.Arbitrary<unknown> = fc.oneof(
  fc.constantFrom(
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0.01,
    0.0500001,
    1,
    -1,
    null,
    undefined,
    '',
    '123',
    '12345678901',
    'abcdefghij',
  ),
  fc.double(),
  fc.string(),
  fc.boolean(),
  fc.anything(),
  // Treatments with 4 or more tools, and tools with bad shapes.
  fc.array(arbRawTool, { minLength: 4, maxLength: 6 }),
  fc.array(fc.anything(), { maxLength: 5 }),
);

/** Events with arbitrary, usually invalid, payloads. */
export const arbBadEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  arbJunk.map((cik): GameEvent => ({ type: 'selectFirm', cik })),
  fc.constant<GameEvent>({ type: 'captureDone' }),
  fc
    .record({ treatment: arbJunk, result: arbJunk })
    .map(({ treatment, result }): GameEvent => ({ type: 'pullSwitch', treatment, result })),
  fc.constant<GameEvent>({ type: 'continue' }),
  fc.constant<GameEvent>({ type: 'cancel' }),
  arbJunk.map((value): GameEvent => ({ type: 'setRateShock', value })),
  arbJunk.map((treatment): GameEvent => ({ type: 'setTreatment', treatment })),
  arbJunk.map((result): GameEvent => ({ type: 'setResult', result })),
);

/** Valid Settings value (every field in its allowed domain, including reducedMotion: null). */
export const arbSettings: fc.Arbitrary<Settings> = fc.record({
  lights: fc.constantFrom<'off' | 'on'>('off', 'on'),
  sound: fc.boolean(),
  lowQuality: fc.boolean(),
  reducedMotion: fc.constantFrom<boolean | null>(true, false, null),
});

// ---------------------------------------------------------------------------
// Data contract arbitraries
// ---------------------------------------------------------------------------

/** Finite double in [min, max]; never -0 so JSON round trips compare equal. */
const arbDouble = (min: number, max: number): fc.Arbitrary<number> =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true }).map((n) => (n === 0 ? 0 : n));

const arbMoney = arbDouble(-1e12, 1e12);
const arbRatio = arbDouble(-1, 1);
const arbNullable = <T>(a: fc.Arbitrary<T>): fc.Arbitrary<T | null> => fc.option(a, { nil: null });
const arbText = fc.string({ minLength: 1, maxLength: 20 });
const arbSectorName = fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,15}$/);

/** Real calendar date, YYYY-MM-DD. */
const arbIsoDate = fc
  .integer({ min: 0, max: 20000 })
  .map((d) => new Date(Date.UTC(1990, 0, 1 + d)).toISOString().slice(0, 10));

/** ISO 8601 date-time with Z. */
const arbIsoDateTime = fc
  .integer({ min: 631152000000, max: 2208988800000 })
  .map((ms) => new Date(ms).toISOString());

/** Strictly ascending integer years. */
const arbAscendingYears = (minLength: number, maxLength: number): fc.Arbitrary<number[]> =>
  fc
    .uniqueArray(fc.integer({ min: 1995, max: 2035 }), { minLength, maxLength })
    .map((ys) => [...ys].sort((a, b) => a - b));

const STATUS_VALUES: FirmStatus[] = ['zombie', 'endangered', 'healthy', 'insufficient_data'];

export const arbStatus: fc.Arbitrary<FirmStatus> = fc.constantFrom(...STATUS_VALUES);

export const arbFirmIndexEntry: fc.Arbitrary<FirmIndexEntry> = fc.record({
  cik: arbCik,
  ticker: arbNullable(fc.stringMatching(/^[A-Z]{1,5}$/)),
  name: arbText,
  sector: arbText,
  sic: fc.stringMatching(/^\d{4}$/),
  first_filing_year: fc.integer({ min: 1990, max: 2024 }),
  age_years: fc.nat({ max: 60 }),
  status: arbStatus,
  latest_icr: arbNullable(arbDouble(-100, 100)),
  total_debt_usd: arbNullable(arbMoney),
  implied_rate: arbNullable(arbDouble(0, 1)),
  shock_eligible: fc.boolean(),
  rescue_eligible: fc.boolean(),
});

export const arbFirmsIndex: fc.Arbitrary<FirmsIndex> = fc
  .record({
    generated_at: arbIsoDateTime,
    source: arbText,
    definition_version: arbText,
    fiscal_years: arbAscendingYears(0, 8),
    firms: fc.uniqueArray(arbFirmIndexEntry, { selector: (f) => f.cik, maxLength: 8 }),
  })
  .map(({ firms, ...meta }) => {
    const counts: Record<FirmStatus, number> = {
      zombie: 0,
      endangered: 0,
      healthy: 0,
      insufficient_data: 0,
    };
    for (const f of firms) counts[f.status] += 1;
    return { meta: { ...meta, counts }, firms };
  });

const arbFirmYear = (fy: number): fc.Arbitrary<FirmYear> =>
  fc.record({
    fy: fc.constant(fy),
    revenue_usd: arbNullable(arbMoney),
    ebit_usd: arbNullable(arbMoney),
    interest_expense_usd: arbNullable(arbMoney),
    total_debt_usd: arbNullable(arbMoney),
    total_assets_usd: arbNullable(arbMoney),
    equity_usd: arbNullable(arbMoney),
    icr: arbNullable(arbDouble(-100, 100)),
    ebit_tag: arbNullable(arbText),
    revenue_tag: arbNullable(arbText),
    debt_tags: fc.array(arbText, { maxLength: 3 }),
  });

/** Valid firm file: `years` strictly ascending by `fy`, nullable fields sometimes null. */
export const arbFirm: fc.Arbitrary<Firm> = fc.record({
  cik: arbCik,
  name: arbText,
  ticker: arbNullable(fc.stringMatching(/^[A-Z]{1,5}$/)),
  sector: arbText,
  status: arbStatus,
  reasons: fc.array(arbText, { maxLength: 3 }),
  as_of_filing: fc.record({
    fiscal_year: fc.integer({ min: 1995, max: 2035 }),
    filed: arbIsoDate,
    form: arbText,
  }),
  years: arbAscendingYears(0, 6).chain((ys) =>
    fc.tuple(...ys.map((y) => arbFirmYear(y))),
  ) as fc.Arbitrary<FirmYear[]>,
  rescue_inputs: fc.record({
    margin_mean: arbRatio,
    margin_change_mean: arbRatio,
    margin_change_sd: arbDouble(0, 1),
    revenue_growth_median: arbRatio,
    history_years: fc.nat({ max: 30 }),
    used_sector_fallback: fc.boolean(),
  }),
});

const arbSectorMedians: fc.Arbitrary<SectorMedians> = fc.record({
  margin_mean: arbRatio,
  margin_change_mean: arbRatio,
  margin_change_sd: arbDouble(0, 1),
  revenue_growth_median: arbRatio,
});

export const arbMacro: fc.Arbitrary<Macro> = fc.record({
  dgs10: fc.record({ value: arbDouble(0, 0.2), date: arbIsoDate, source: arbText }),
  sector_medians: fc.dictionary(arbSectorName, arbSectorMedians, { maxKeys: 4 }),
});

// ---------------------------------------------------------------------------
// Single-field corruption
// ---------------------------------------------------------------------------

type Seg = string | number;

export interface Corruption {
  /** The corrupted copy of the input (the input is not mutated). May hold NaN or Infinity. */
  value: unknown;
  /** JSON path the guard must report, in the guards' format, e.g. `$.firms[0].latest_icr`. */
  path: string;
  kind: 'replace' | 'delete' | 'extraKey';
}

interface Candidate {
  kind: Corruption['kind'];
  segs: Seg[];
}

const EXTRA_KEY = 'zz_extra';

const isObjectNode = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const pathOf = (segs: Seg[]): string =>
  segs.reduce<string>((p, s) => (typeof s === 'number' ? `${p}[${s}]` : `${p}.${s}`), '$');

function clone(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(clone);
  if (isObjectNode(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = clone(v[k]);
    return out;
  }
  return v;
}

function collect(v: unknown, segs: Seg[], out: Candidate[]): void {
  out.push({ kind: 'replace', segs });
  if (Array.isArray(v)) {
    v.forEach((item, i) => collect(item, [...segs, i], out));
  } else if (isObjectNode(v)) {
    // `sector_medians` is a free-form record: removing or adding keys there is valid.
    const free = segs[segs.length - 1] === 'sector_medians';
    if (!free) out.push({ kind: 'extraKey', segs });
    for (const k of Object.keys(v)) {
      if (!free) out.push({ kind: 'delete', segs: [...segs, k] });
      collect(v[k], [...segs, k], out);
    }
  }
}

/** Replacement values that are invalid for any field of the contract at that spot. */
function replacementsFor(v: unknown): unknown[] {
  if (typeof v === 'number') return ['x', {}, Number.NaN, Number.POSITIVE_INFINITY];
  if (typeof v === 'string') return [123, {}, false];
  if (typeof v === 'boolean') return ['yes', 1];
  if (v === null) return [{}, []]; // a plain number or string would be valid for a nullable field
  return ['corrupt', 42]; // objects and arrays
}

function apply(root: unknown, c: Candidate, pick: number): Corruption {
  const copy = clone(root);
  if (c.kind === 'replace') {
    const choices = replacementsFor(root === undefined ? null : getAt(root, c.segs));
    const replacement = choices[pick % choices.length];
    if (c.segs.length === 0) return { value: replacement, path: '$', kind: 'replace' };
    setAt(copy, c.segs, replacement);
    return { value: copy, path: pathOf(c.segs), kind: 'replace' };
  }
  if (c.kind === 'delete') {
    const parent = getAt(copy, c.segs.slice(0, -1)) as Record<string, unknown>;
    delete parent[c.segs[c.segs.length - 1] as string];
    return { value: copy, path: pathOf(c.segs), kind: 'delete' };
  }
  const target = getAt(copy, c.segs) as Record<string, unknown>;
  target[EXTRA_KEY] = 1;
  return { value: copy, path: pathOf([...c.segs, EXTRA_KEY]), kind: 'extraKey' };
}

function getAt(root: unknown, segs: Seg[]): unknown {
  let cur: unknown = root;
  for (const s of segs) cur = (cur as Record<Seg, unknown>)[s];
  return cur;
}

function setAt(root: unknown, segs: Seg[], value: unknown): void {
  const parent = getAt(root, segs.slice(0, -1)) as Record<Seg, unknown>;
  parent[segs[segs.length - 1] as Seg] = value;
}

/**
 * One single-field corruption of a valid JSON value: replace a field with a value of the wrong
 * type (or NaN/Infinity for numbers), delete a required key, or add an unknown key.
 * Every result is invalid for the data guards, which must report `path`.
 */
export function arbCorruption(value: unknown): fc.Arbitrary<Corruption> {
  const candidates: Candidate[] = [];
  collect(value, [], candidates);
  return fc
    .tuple(fc.constantFrom(...candidates), fc.nat({ max: 3 }))
    .map(([c, pick]) => apply(value, c, pick));
}
