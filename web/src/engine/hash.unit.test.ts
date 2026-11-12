import { describe, expect, it } from 'vitest';
import { fnv1a32, seedFrom } from './hash';
import type { Treatment } from './types';

/** Independent FNV-1a 32-bit: UTF-8 bytes, xor, multiply by 16777619 modulo 2^32. */
function referenceFnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(input)) {
    h = Math.imul(h ^ byte, 16777619);
  }
  return h >>> 0;
}

const CUT_005: Treatment = [{ name: 'cut_costs', params: { c: 0.05 } }];
const CIK = '9000000001';
const DATE = '2025-02-20';
const PINNED_SEED = 1541187404;

function errorCode(r: ReturnType<typeof seedFrom>): string | undefined {
  return r.ok ? undefined : r.error.code;
}

describe('fnv1a32 published vectors', () => {
  it.each([
    ['', 0x811c9dc5],
    ['a', 0xe40c292c],
    ['foobar', 0xbf9cf968],
  ])('hashes %j', (input, expected) => {
    expect(fnv1a32(input)).toBe(expected);
    expect(fnv1a32(input)).toBe(expected);
  });
});

describe('seedFrom', () => {
  it('matches the pinned value and the independent FNV-1a of the expected input', () => {
    const input = '9000000001|cut_costs,c=0.05|2025-02-20';
    const first = seedFrom(CIK, CUT_005, DATE);
    const second = seedFrom(CIK, CUT_005, DATE);
    expect(first).toEqual({ ok: true, value: referenceFnv1a(input) });
    expect(second).toEqual({ ok: true, value: referenceFnv1a(input) });
    expect(first).toEqual({ ok: true, value: PINNED_SEED });
    expect(second).toEqual({ ok: true, value: PINNED_SEED });
  });

  it('gives distinct seeds when only one ingredient differs', () => {
    const base = seedFrom(CIK, CUT_005, DATE);
    const otherCik = seedFrom('9000000002', CUT_005, DATE);
    const otherParam = seedFrom(CIK, [{ name: 'cut_costs', params: { c: 0.06 } }], DATE);
    const otherTools = seedFrom(CIK, [{ name: 'refinance', params: {} }], DATE);
    const otherDate = seedFrom(CIK, CUT_005, '2025-02-21');
    const values = [base, otherCik, otherParam, otherTools, otherDate].map((r) => {
      expect(r.ok).toBe(true);
      return r.ok ? r.value : -1;
    });
    expect(new Set(values).size).toBe(values.length);
  });

  it('rejects impossible dates and accepts a leap day', () => {
    expect(errorCode(seedFrom(CIK, CUT_005, '2025-02-30'))).toBe('invalid_date');
    expect(errorCode(seedFrom(CIK, CUT_005, '2023-02-29'))).toBe('invalid_date');
    expect(seedFrom(CIK, CUT_005, '2024-02-29').ok).toBe(true);
  });

  it('rejects a 9-digit cik', () => {
    expect(errorCode(seedFrom('900000001', CUT_005, DATE))).toBe('invalid_cik');
  });

  it('checks treatment first, then cik, then date', () => {
    const badTreatment = [{ name: 'nope', params: {} }] as unknown as Treatment;
    expect(errorCode(seedFrom('1', badTreatment, 'bad'))).toBe('unknown_tool');
    expect(errorCode(seedFrom('1', CUT_005, 'bad'))).toBe('invalid_cik');
    expect(errorCode(seedFrom(CIK, CUT_005, 'bad'))).toBe('invalid_date');
  });
});
