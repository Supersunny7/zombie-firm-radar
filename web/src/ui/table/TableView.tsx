import { useCallback, useRef, useState } from 'react';
import type { DataSource } from '../../data/source';
import { useStore } from '../../state/store';
import { TABLE_BUTTON_ID } from '../SkipLink';
import { useFocusTrap } from '../useFocusTrap';
import { formatDebt, formatIcr } from './format';
import { nextSort, sortRows, type SortKey, type SortState } from './sort';
import { StatusLabel } from './StatusLabel';

const COLUMNS: readonly { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'sector', label: 'Sector' },
  { key: 'status', label: 'Status' },
  { key: 'icr', label: 'ICR' },
  { key: 'debt', label: 'Debt' },
];

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';
const btn = `rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text ${FOCUS_RING}`;

export const SELECT_ONLY_IN_GRAVEYARD = 'Selection is only possible in the graveyard.';

const SORT_HINT = 'Sort by activating a column header.';

/** Mock and fixture data are fictional, so the caption must not claim SEC EDGAR as the source. */
function captionFor(source: DataSource | null): string {
  return source === 'mock' || source === 'fixture'
    ? `Fictional firms (mock data). ${SORT_HINT}`
    : `Firms from SEC EDGAR filings. ${SORT_HINT}`;
}

/** Shows the overlay only while the store's overlay mode is `table`; remounting resets local state. */
export function TableView() {
  const open = useStore((s) => s.overlay === 'table');
  return open ? <TableDialog /> : null;
}

function TableDialog() {
  const rows = useStore((s) => s.data?.index.firms);
  const source = useStore((s) => s.data?.source ?? null);
  const closeOverlay = useStore((s) => s.closeOverlay);
  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' });
  const [message, setMessage] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    closeOverlay();
    document.getElementById(TABLE_BUTTON_ID)?.focus();
  }, [closeOverlay]);

  useFocusTrap(ref, { onEscape: close });

  const sorted = sortRows(rows ?? [], sort);

  const select = (cik: string) => {
    const { machine, selectFirm } = useStore.getState();
    if (machine.state !== 'graveyard') {
      setMessage(SELECT_ONLY_IN_GRAVEYARD);
      return;
    }
    selectFirm(cik);
    close();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 pb-16">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-view-title"
        className="flex max-h-full w-full max-w-5xl flex-col gap-3 rounded-panel border border-panel-border bg-panel p-4 font-ui text-text"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="table-view-title" className="font-display text-2xl font-semibold">
            Table view
          </h2>
          <button type="button" className={btn} onClick={close}>
            Close
          </button>
        </div>
        <p role="status" className="min-h-5 text-sm text-status-endangered">
          {message}
        </p>
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="pb-2 text-left text-text-2">{captionFor(source)}</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={
                        active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className="border-b border-panel-border px-2 py-1"
                    >
                      <button
                        type="button"
                        className={`font-semibold ${FOCUS_RING}`}
                        onClick={() => setSort((cur) => nextSort(cur, c.key))}
                      >
                        {c.label}
                        {active && (
                          <span aria-hidden="true">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                        )}
                      </button>
                    </th>
                  );
                })}
                <th scope="col" className="border-b border-panel-border px-2 py-1">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-2 py-2">
                    No firms in the data set
                  </td>
                </tr>
              ) : (
                sorted.map((f) => (
                  <tr key={f.cik} className="border-b border-panel-border/50">
                    <td className="px-2 py-1 font-display text-base">{f.name}</td>
                    <td className="px-2 py-1">{f.sector}</td>
                    <td className="px-2 py-1">
                      <StatusLabel status={f.status} />
                    </td>
                    <td className="px-2 py-1 font-mono">{formatIcr(f.latest_icr)}</td>
                    <td className="px-2 py-1 font-mono">{formatDebt(f.total_debt_usd)}</td>
                    <td className="px-2 py-1">
                      {f.rescue_eligible && (
                        <button
                          type="button"
                          className={btn}
                          aria-label={`Select ${f.name}`}
                          onClick={() => select(f.cik)}
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
