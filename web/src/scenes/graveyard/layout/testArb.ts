/** Shared fast-check arbitraries for the layout tests. */
import fc from 'fast-check';
import type { LayoutInput } from './layout';

export const STATUSES: LayoutInput['status'][] = [
  'zombie',
  'endangered',
  'healthy',
  'insufficient_data',
];

/** Generated firm lists with unique ciks, 1 to `maxSectors` sectors and all four statuses. */
export const firmsArb = (maxLen = 60, maxSectors = 6): fc.Arbitrary<LayoutInput[]> =>
  fc
    .uniqueArray(fc.integer({ min: 0, max: 999_999 }), { minLength: 1, maxLength: maxLen })
    .chain((ids) =>
      fc.tuple(
        fc.constant(ids),
        fc.array(fc.integer({ min: 0, max: maxSectors - 1 }), {
          minLength: ids.length,
          maxLength: ids.length,
        }),
        fc.array(fc.constantFrom(...STATUSES), {
          minLength: ids.length,
          maxLength: ids.length,
        }),
        fc.array(fc.option(fc.double({ min: 1e3, max: 1e11, noNaN: true }), { nil: null }), {
          minLength: ids.length,
          maxLength: ids.length,
        }),
      ),
    )
    .map(([ids, sectors, statuses, debts]) =>
      ids.map((id, i) => ({
        cik: String(id).padStart(10, '0'),
        sector: `Sector ${sectors[i]}`,
        status: statuses[i] as LayoutInput['status'],
        total_debt_usd: debts[i] ?? null,
      })),
    );
