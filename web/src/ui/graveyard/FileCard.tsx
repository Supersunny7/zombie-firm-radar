import { useEffect, useMemo, useRef, useState } from 'react';
import type { Loader } from '../../data/loader';
import { useShockView } from '../../state/shockView';
import { useStore } from '../../state/store';
import { formatDebt, formatIcr } from '../table/format';
import { StatusLabel } from '../table/StatusLabel';
import { chooseDock, type Rect } from './chooseDock';

export interface FileCardProps {
  /** Lazy source of the firm file (for reasons). Without it the card uses status lines only. */
  loader?: Pick<Loader, 'loadFirm'>;
  /** Projected screen rectangle of the stone, if known (scene frame loop). */
  stoneRect?: Rect | null;
}

function useViewport(): { width: number; height: number } {
  const [vp, setVp] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/** The single File_Card. Rendered once; content follows `cardCik` in the store. */
export function FileCard({ loader, stoneRect = null }: FileCardProps) {
  const cik = useStore((s) => s.cardCik);
  const opener = useStore((s) => s.cardOpener);
  const closeCard = useStore((s) => s.closeCard);
  const { firms, batch } = useShockView();
  const vp = useViewport();

  const index = useMemo(
    () => (cik === null ? -1 : firms.findIndex((f) => f.cik === cik)),
    [cik, firms],
  );
  const entry = index >= 0 ? (firms[index] ?? null) : null;

  const [loaded, setLoaded] = useState<{ cik: string; reasons: string[] } | null>(null);
  useEffect(() => {
    if (cik === null || loader === undefined) return;
    let cancelled = false;
    void loader.loadFirm(cik).then((res) => {
      if (!cancelled && res.ok) setLoaded({ cik, reasons: res.value.reasons });
    });
    return () => {
      cancelled = true;
    };
  }, [cik, loader]);

  // Focus: remember the opener element; move focus in only for keyboard/table opens.
  const openerEl = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = cik !== null;
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    if (openerEl.current === null && active instanceof HTMLElement && active !== document.body) {
      openerEl.current = active;
    }
    if (opener === 'keyboard' || opener === 'table') closeRef.current?.focus();
  }, [open, opener]);

  const close = () => {
    const el = openerEl.current;
    openerEl.current = null;
    closeCard();
    if (el !== null && el.isConnected) el.focus();
  };

  if (cik === null || entry === null) return null;

  const dock = chooseDock(stoneRect, vp);
  const newlyUndead = batch.newlyUndead[index] === 1;
  const shocked = batch.shockedIcr[index];
  const reasons: string[] = [];
  if (loaded?.cik === cik) reasons.push(...loaded.reasons);
  if (entry.status === 'insufficient_data') reasons.push('Not enough data');
  if (newlyUndead && shocked !== undefined) {
    reasons.push(`Undead under this rate shock: ICR ${formatIcr(shocked)}`);
  }

  const placement =
    dock === 'right'
      ? 'right-0 top-0 h-full w-80 max-w-full'
      : 'bottom-0 left-0 w-full max-w-[480px] max-h-[260px]';

  return (
    <aside
      aria-label="File card"
      data-dock={dock}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      className={`fixed z-20 overflow-y-auto rounded-panel border border-panel-border bg-panel p-4 text-text ${placement}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{entry.name}</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="rounded-panel border border-panel-border px-2 py-1 text-sm text-text-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          Close
        </button>
      </div>
      <p className="text-sm text-text-2">{entry.sector}</p>
      <p className="mt-2 text-sm">
        <StatusLabel status={entry.status} />
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 font-mono text-sm">
        <dt className="text-text-2">ICR</dt>
        <dd>{formatIcr(entry.latest_icr)}</dd>
        <dt className="text-text-2">Total debt</dt>
        <dd>{formatDebt(entry.total_debt_usd)}</dd>
      </dl>
      {reasons.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default FileCard;
