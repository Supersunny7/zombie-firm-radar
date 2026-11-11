/**
 * Hand-written runtime guards for the data contract (no ajv at runtime).
 * Pure TypeScript: no React or three imports.
 *
 * Behaviour follows /data/schema/*.json: every key is required (a missing key
 * is invalid, `null` is valid only where the type allows it) and unknown keys
 * are rejected, because the schemas set `additionalProperties: false` (except
 * `macro.sector_medians`, whose keys are free-form sector names).
 */

import type { Firm, FirmsIndex, FirmStatus, Macro } from '../types/data';

export type GuardFailure = { ok: false; path: string; expected: string; actual: string };
export type GuardResult<T> = { ok: true; value: T } | GuardFailure;

/** A guard checks `value` found at JSON path `path` (e.g. `$.firms[3].latest_icr`). */
export type Guard<T> = (value: unknown, path: string) => GuardResult<T>;

const ok = <T>(value: T): GuardResult<T> => ({ ok: true, value });
const fail = (path: string, expected: string, actual: string): GuardFailure => ({
  ok: false,
  path,
  expected,
  actual,
});

/** Short human-readable type name of an arbitrary JSON-ish value. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number')
    return Number.isFinite(value) ? 'number' : `non-finite number (${String(value)})`;
  return typeof value;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (o: object, key: string): boolean => Object.prototype.hasOwnProperty.call(o, key);

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

export const str: Guard<string> = (value, path) =>
  typeof value === 'string' ? ok(value) : fail(path, 'string', describe(value));

export const bool: Guard<boolean> = (value, path) =>
  typeof value === 'boolean' ? ok(value) : fail(path, 'boolean', describe(value));

export interface NumOptions {
  integer?: boolean;
  min?: number;
}

/** Finite number (`Number.isFinite`); optionally an integer and/or at least `min`. */
export function num(options: NumOptions = {}): Guard<number> {
  const label = `${options.integer ? 'integer' : 'number'}${options.min !== undefined ? ` >= ${options.min}` : ''}`;
  return (value, path) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      return fail(path, label, describe(value));
    if (options.integer && !Number.isInteger(value))
      return fail(path, label, `non-integer number (${value})`);
    if (options.min !== undefined && value < options.min)
      return fail(path, label, `number (${value})`);
    return ok(value);
  };
}

/** Accepts `null` or whatever `inner` accepts. `undefined` (missing) is rejected by `inner`. */
export function nullable<T>(inner: Guard<T>): Guard<T | null> {
  return (value, path) => {
    if (value === null) return ok(null);
    const r = inner(value, path);
    if (r.ok) return r;
    return fail(r.path, `${r.expected} or null`, r.actual);
  };
}

export function arrayOf<T>(item: Guard<T>): Guard<T[]> {
  return (value, path) => {
    if (!Array.isArray(value)) return fail(path, 'array', describe(value));
    for (let i = 0; i < value.length; i++) {
      const r = item(value[i], `${path}[${i}]`);
      if (!r.ok) return r;
    }
    return ok(value as T[]);
  };
}

/** One of a fixed set of string literals. */
export function oneOf<const T extends string>(allowed: readonly T[]): Guard<T> {
  return (value, path) =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? ok(value as T)
      : fail(path, `one of ${allowed.map((a) => `"${a}"`).join(', ')}`, describeEnumActual(value));
}

function describeEnumActual(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : describe(value);
}

/** Ten-digit zero-padded CIK string. */
export const cik: Guard<string> = (value, path) => {
  if (typeof value !== 'string') return fail(path, '10-digit CIK string', describe(value));
  return /^\d{10}$/.test(value)
    ? ok(value)
    : fail(path, '10-digit CIK string', `string "${value}"`);
};

/** Strings matching an ISO date (YYYY-MM-DD, real calendar date). */
export const isoDate: Guard<string> = (value, path) => {
  if (typeof value !== 'string') return fail(path, 'date string (YYYY-MM-DD)', describe(value));
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d)
      return ok(value);
  }
  return fail(path, 'date string (YYYY-MM-DD)', `string "${value}"`);
};

/** Strings matching an ISO 8601 / RFC 3339 date-time with a time zone. */
export const isoDateTime: Guard<string> = (value, path) => {
  if (typeof value !== 'string') return fail(path, 'date-time string (ISO 8601)', describe(value));
  const ok1 = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/.test(value);
  return ok1 && !Number.isNaN(Date.parse(value))
    ? ok(value)
    : fail(path, 'date-time string (ISO 8601)', `string "${value}"`);
};

/** Wraps a numeric-array guard and requires strictly ascending values. */
export function ascending(inner: Guard<number[]>): Guard<number[]> {
  return (value, path) => {
    const r = inner(value, path);
    if (!r.ok) return r;
    for (let i = 1; i < r.value.length; i++) {
      const prev = r.value[i - 1] as number;
      const cur = r.value[i] as number;
      if (cur <= prev)
        return fail(`${path}[${i}]`, `ascending order (greater than ${prev})`, `number (${cur})`);
    }
    return r;
  };
}

/** Same as `ascending`, for arrays of objects ordered by a numeric key. */
export function ascendingBy<T extends object>(
  inner: Guard<T[]>,
  key: keyof T & string,
): Guard<T[]> {
  return (value, path) => {
    const r = inner(value, path);
    if (!r.ok) return r;
    for (let i = 1; i < r.value.length; i++) {
      const prev = (r.value[i - 1] as Record<string, unknown>)[key] as number;
      const cur = (r.value[i] as Record<string, unknown>)[key] as number;
      if (cur <= prev) {
        return fail(
          `${path}[${i}].${key}`,
          `ascending order (greater than ${prev})`,
          `number (${cur})`,
        );
      }
    }
    return r;
  };
}

/**
 * Object with exactly the keys in `shape`. A missing key is invalid
 * (`actual: "missing"`); unknown keys are invalid (schema `additionalProperties: false`).
 */
export function obj<T extends object>(shape: { [K in keyof T]-?: Guard<T[K]> }): Guard<T> {
  const keys = Object.keys(shape);
  return (value, path) => {
    if (!isRecord(value)) return fail(path, 'object', describe(value));
    for (const key of keys) {
      const childPath = `${path}.${key}`;
      if (!hasOwn(value, key) || value[key] === undefined)
        return fail(childPath, 'present key', 'missing');
      const guard = (shape as Record<string, Guard<unknown>>)[key] as Guard<unknown>;
      const r = guard(value[key], childPath);
      if (!r.ok) return r;
    }
    for (const key of Object.keys(value)) {
      if (!hasOwn(shape, key))
        return fail(`${path}.${key}`, 'no additional properties', 'unexpected key');
    }
    return ok(value as T);
  };
}

/** Object with free-form keys whose values all pass `item`. */
export function record<T>(item: Guard<T>): Guard<Record<string, T>> {
  return (value, path) => {
    if (!isRecord(value)) return fail(path, 'object', describe(value));
    for (const key of Object.keys(value)) {
      const r = item(value[key], `${path}.${key}`);
      if (!r.ok) return r;
    }
    return ok(value as Record<string, T>);
  };
}

// ---------------------------------------------------------------------------
// Data contract guards
// ---------------------------------------------------------------------------

const STATUSES = [
  'zombie',
  'endangered',
  'healthy',
  'insufficient_data',
] as const satisfies readonly FirmStatus[];
const status = oneOf<FirmStatus>(STATUSES);

const anyNum = num();
const nullableNum = nullable(anyNum);
const nullableStr = nullable(str);
const int = num({ integer: true });
const count = num({ integer: true, min: 0 });

const firmsIndexGuard: Guard<FirmsIndex> = obj<FirmsIndex>({
  meta: obj<FirmsIndex['meta']>({
    generated_at: isoDateTime,
    source: str,
    definition_version: str,
    fiscal_years: ascending(arrayOf(int)),
    counts: obj<FirmsIndex['meta']['counts']>({
      zombie: count,
      endangered: count,
      healthy: count,
      insufficient_data: count,
    }),
  }),
  firms: arrayOf(
    obj<FirmsIndex['firms'][number]>({
      cik,
      ticker: nullableStr,
      name: str,
      sector: str,
      sic: str,
      first_filing_year: int,
      age_years: count,
      status,
      latest_icr: nullableNum,
      total_debt_usd: nullableNum,
      implied_rate: nullableNum,
      shock_eligible: bool,
      rescue_eligible: bool,
    }),
  ),
});

type FirmYearT = Firm['years'][number];

const firmGuard: Guard<Firm> = obj<Firm>({
  cik,
  name: str,
  ticker: nullableStr,
  sector: str,
  status,
  reasons: arrayOf(str),
  as_of_filing: obj<Firm['as_of_filing']>({ fiscal_year: int, filed: isoDate, form: str }),
  years: ascendingBy(
    arrayOf(
      obj<FirmYearT>({
        fy: int,
        revenue_usd: nullableNum,
        ebit_usd: nullableNum,
        interest_expense_usd: nullableNum,
        total_debt_usd: nullableNum,
        total_assets_usd: nullableNum,
        equity_usd: nullableNum,
        icr: nullableNum,
        ebit_tag: nullableStr,
        revenue_tag: nullableStr,
        debt_tags: arrayOf(str),
      }),
    ),
    'fy',
  ),
  rescue_inputs: obj<Firm['rescue_inputs']>({
    margin_mean: anyNum,
    margin_change_mean: anyNum,
    margin_change_sd: num({ min: 0 }),
    revenue_growth_median: anyNum,
    history_years: count,
    used_sector_fallback: bool,
  }),
});

const macroGuard: Guard<Macro> = obj<Macro>({
  dgs10: obj<Macro['dgs10']>({ value: anyNum, date: isoDate, source: str }),
  sector_medians: record(
    obj<Macro['sector_medians'][string]>({
      margin_mean: anyNum,
      margin_change_mean: anyNum,
      margin_change_sd: num({ min: 0 }),
      revenue_growth_median: anyNum,
    }),
  ),
});

/** Validate parsed `/data/firms_index.json`. Paths start at `$`. */
export const guardFirmsIndex = (value: unknown): GuardResult<FirmsIndex> =>
  firmsIndexGuard(value, '$');
/** Validate parsed `/data/firms/{cik}.json`. Paths start at `$`. */
export const guardFirm = (value: unknown): GuardResult<Firm> => firmGuard(value, '$');
/** Validate parsed `/data/macro.json`. Paths start at `$`. */
export const guardMacro = (value: unknown): GuardResult<Macro> => macroGuard(value, '$');
