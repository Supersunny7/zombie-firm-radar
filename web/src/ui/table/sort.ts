import type { FirmIndexEntry, FirmStatus } from '../../types/data';

export type SortKey = 'name' | 'sector' | 'status' | 'icr' | 'debt';
export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: SortKey | null;
  dir: SortDir;
}

const STATUS_RANK: Record<FirmStatus, number> = {
  zombie: 0,
  endangered: 1,
  healthy: 2,
  insufficient_data: 3,
};

/** New column sorts ascending; the active column flips direction. */
export function nextSort(cur: SortState, clicked: SortKey): SortState {
  if (cur.key === clicked) {
    return { key: clicked, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key: clicked, dir: 'asc' };
}

function compareText(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' });
}

function numericValue(row: FirmIndexEntry, key: 'icr' | 'debt'): number | null {
  const v = key === 'icr' ? row.latest_icr : row.total_debt_usd;
  return v === null || !Number.isFinite(v) ? null : v;
}

/**
 * Returns a new array. Nulls go last in both directions, ties break by name
 * ascending (case-insensitive) in both directions, then by original index.
 */
export function sortRows(rows: readonly FirmIndexEntry[], s: SortState): FirmIndexEntry[] {
  const key = s.key;
  if (key === null) return [...rows];
  const sign = s.dir === 'asc' ? 1 : -1;

  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((x, y) => {
    let primary: number;
    if (key === 'name') {
      primary = sign * compareText(x.row.name, y.row.name);
    } else if (key === 'sector') {
      primary = sign * compareText(x.row.sector, y.row.sector);
    } else if (key === 'status') {
      primary = sign * (STATUS_RANK[x.row.status] - STATUS_RANK[y.row.status]);
    } else {
      const a = numericValue(x.row, key);
      const b = numericValue(y.row, key);
      if (a === null || b === null) {
        if (a === b) primary = 0;
        else return a === null ? 1 : -1;
      } else {
        primary = a === b ? 0 : sign * (a < b ? -1 : 1);
      }
    }
    if (primary !== 0) return primary;
    const byName = compareText(x.row.name, y.row.name);
    if (byName !== 0) return byName;
    return x.index - y.index;
  });
  return indexed.map((e) => e.row);
}
