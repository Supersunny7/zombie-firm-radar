// Feature: app-shell, Property 7: Table sorting is a correctly ordered permutation
// **Validates: Requirements 12.9, 12.12, 12.13, 12.14, 12.15, 12.26**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbFirmIndexEntry } from '../../test/arbitraries';
import type { FirmIndexEntry, FirmStatus } from '../../types/data';
import { nextSort, sortRows, type SortDir, type SortKey, type SortState } from './sort';

const KEYS: SortKey[] = ['name', 'sector', 'status', 'icr', 'debt'];
const DIRS: SortDir[] = ['asc', 'desc'];
const STATUS_ORDER: FirmStatus[] = ['zombie', 'endangered', 'healthy', 'insufficient_data'];

// Small pool of mixed-case, duplicated names and sectors to force ties.
const POOL = ['Acme', 'ACME', 'acme', 'Beta Corp', 'beta corp', 'Zed', 'zed', 'Omega'];
const arbPoolText = fc.oneof(fc.constantFrom(...POOL), fc.string({ minLength: 1, maxLength: 8 }));
// Small value pools so numeric ties also occur.
const arbTieNumber = fc.oneof(
  fc.constant(null),
  fc.constantFrom(-1, 0, 0.5, 1, 2),
  fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
);

const arbRow: fc.Arbitrary<FirmIndexEntry> = fc
  .tuple(arbFirmIndexEntry, arbPoolText, arbPoolText, arbTieNumber, arbTieNumber)
  .map(([e, name, sector, icr, debt]) => ({
    ...e,
    name,
    sector,
    latest_icr: icr === 0 ? 0 : icr,
    total_debt_usd: debt === 0 ? 0 : debt,
  }));

const arbRows = fc.array(arbRow, { maxLength: 30 });

// Same text comparison contract as the spec: case-insensitive.
const cmpText = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' });

function value(row: FirmIndexEntry, key: SortKey): string | number | null {
  switch (key) {
    case 'name':
      return row.name;
    case 'sector':
      return row.sector;
    case 'status':
      return STATUS_ORDER.indexOf(row.status);
    case 'icr':
      return row.latest_icr;
    case 'debt':
      return row.total_debt_usd;
  }
}

function cmpValue(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return cmpText(a, b);
  return (a as number) === (b as number) ? 0 : (a as number) < (b as number) ? -1 : 1;
}

describe('Property 7: Table sorting is a correctly ordered permutation', () => {
  it('sortRows returns an ordered permutation for every column and direction', () => {
    fc.assert(
      fc.property(arbRows, (rows) => {
        const snapshot = structuredClone(rows);
        const refs = [...rows];
        for (const key of KEYS) {
          for (const dir of DIRS) {
            const out = sortRows(rows, { key, dir });

            // New array, input not mutated.
            expect(out).not.toBe(rows);
            expect(rows).toEqual(snapshot);
            expect(rows.every((r, i) => r === refs[i])).toBe(true);

            // Permutation (by identity).
            expect(out).toHaveLength(rows.length);
            expect(new Set(out).size).toBe(new Set(rows).size);
            expect(out.every((r) => rows.includes(r))).toBe(true);
            expect(rows.every((r) => out.includes(r))).toBe(true);

            const sign = dir === 'asc' ? 1 : -1;
            for (let i = 0; i + 1 < out.length; i++) {
              const a = out[i]!;
              const b = out[i + 1]!;
              const va = value(a, key);
              const vb = value(b, key);

              // Nulls last in both directions.
              if (va === null) {
                expect(vb).toBeNull();
              }
              if (va !== null && vb !== null) {
                const primary = sign * cmpValue(va, vb);
                expect(primary).toBeLessThanOrEqual(0);
                if (primary !== 0) continue;
              } else if (va === null && vb === null) {
                // equal on the column
              } else {
                continue; // non-null before null: ordering is by null placement
              }

              // Tie: name ascending case-insensitive, then original position.
              const byName = cmpText(a.name, b.name);
              expect(byName).toBeLessThanOrEqual(0);
              if (byName === 0) {
                expect(rows.indexOf(a)).toBeLessThan(rows.indexOf(b));
              }
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('key null returns a copy in the input order', () => {
    fc.assert(
      fc.property(arbRows, fc.constantFrom(...DIRS), (rows, dir) => {
        const out = sortRows(rows, { key: null, dir });
        expect(out).not.toBe(rows);
        expect(out).toHaveLength(rows.length);
        expect(out.every((r, i) => r === rows[i])).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('nextSort flips the active column and starts a new column ascending', () => {
    const arbState: fc.Arbitrary<SortState> = fc.record({
      key: fc.option(fc.constantFrom(...KEYS), { nil: null }),
      dir: fc.constantFrom(...DIRS),
    });
    fc.assert(
      fc.property(arbState, fc.constantFrom(...KEYS), (cur, clicked) => {
        const next = nextSort(cur, clicked);
        expect(next.key).toBe(clicked);
        if (cur.key === clicked) {
          expect(next.dir).toBe(cur.dir === 'asc' ? 'desc' : 'asc');
        } else {
          expect(next.dir).toBe('asc');
        }
      }),
      { numRuns: 100 },
    );
  });
});
