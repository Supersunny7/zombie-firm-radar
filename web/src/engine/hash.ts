import { fail, invalidCik, invalidDate, ok, type EngineResult } from './errors';
import { parseTreatment, serialiseTreatment } from './treatment';
import type { Treatment } from './types';

/** FNV-1a 32-bit hash over the UTF-8 bytes of `s`. Returns an unsigned integer. */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(s)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isLeapYear(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

/** True for a real calendar date written as YYYY-MM-DD (arithmetic Gregorian rules, no Date). */
export function isValidIsoDate(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const max = month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);
  return day <= max;
}

/**
 * Derives the seed for the real outcome. Check order: treatment, cik, isoDate.
 * The treatment is hashed in canonical order, so click order never matters.
 */
export function seedFrom(cik: string, treatment: Treatment, isoDate: string): EngineResult<number> {
  const parsed = parseTreatment(treatment);
  if (!parsed.ok) return fail(parsed.error);
  if (typeof cik !== 'string' || !/^\d{10}$/.test(cik)) return fail(invalidCik(cik));
  if (!isValidIsoDate(isoDate)) return fail(invalidDate(isoDate));
  return ok(fnv1a32(`${cik}|${serialiseTreatment(parsed.value)}|${isoDate}`));
}
