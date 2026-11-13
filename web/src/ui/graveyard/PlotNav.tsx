import { useEffect } from 'react';
import { nextPlot } from '../../scenes/graveyard/layout/camera';
import { useLayout } from '../../state/useLayout';
import { useStore } from '../../state/store';

const chip =
  'rounded-panel border border-panel-border bg-panel px-2 py-1 text-xs text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text aria-pressed:border-text aria-pressed:font-semibold';

function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

/** Plot chips, Overview button and Left/Right plot navigation (requirements 11.2-11.5). */
export function PlotNav() {
  const { plots } = useLayout();
  const framed = useStore((s) => s.framedPlot);
  const setFramedPlot = useStore((s) => s.setFramedPlot);
  const count = plots.length;

  useEffect(() => {
    if (count === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTyping(e.target)) return;
      const st = useStore.getState();
      if (st.focusedCik !== null) return;
      const cur = st.framedPlot === 'overview' ? 0 : st.framedPlot;
      const dir = e.key === 'ArrowRight' ? 'right' : 'left';
      st.setFramedPlot(
        st.framedPlot === 'overview' ? nextPlot(0, dir, count) : nextPlot(cur, dir, count),
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);

  if (count === 0) return null;
  return (
    <nav aria-label="Plots" className="pointer-events-auto flex max-w-full flex-wrap gap-1">
      <button
        type="button"
        className={chip}
        aria-pressed={framed === 'overview'}
        onClick={() => setFramedPlot('overview')}
      >
        ← Overview
      </button>
      {plots.map((p, i) => (
        <button
          key={p.sector}
          type="button"
          className={chip}
          aria-pressed={framed === i}
          onClick={() => setFramedPlot(i)}
        >
          {`${i + 1}. ${p.sector}`}
        </button>
      ))}
    </nav>
  );
}
