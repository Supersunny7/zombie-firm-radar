import { useCallback, type KeyboardEvent } from 'react';
import { nextFocus, type NavDir } from '../../scenes/graveyard/layout/nav';
import { useLayout } from '../../state/useLayout';
import { useStore } from '../../state/store';
import { STONE_PROXY_ATTR } from '../../state/stoneProxy';
import { announce } from './LiveRegion';

export const STONE_PROXY_LABEL = 'Graveyard stones, use arrow keys';

const ARROWS: Readonly<Record<string, NavDir>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

/**
 * The single roving tab stop for stones (Req 18.1, design Section 13). Stones are not DOM
 * nodes, so this visually hidden button carries keyboard focus and the store's `focusedCik`
 * says which stone it stands for.
 *
 * Tab-in selects the first stone in reading order of the framed plot (plot 1 in the
 * overview), unless the stone already focused belongs to that plot. Blur keeps `focusedCik`
 * so Esc can return to the same stone after the card closes.
 *
 * Every focus move announces "{name}, {status}" and frames the stone's plot (Req 18.2-18.9).
 */
export function StoneFocusProxy() {
  const layout = useLayout();
  const firms = useStore((s) => s.data?.index.firms);

  /** Focus a stone by firm index: store, plot framing and live region together. */
  const focusStone = useCallback(
    (index: number) => {
      const firm = firms?.[index];
      const stone = layout.stones[index];
      if (!firm || !stone) return;
      const st = useStore.getState();
      st.setFocused(firm.cik);
      if (st.framedPlot !== stone.plot) st.setFramedPlot(stone.plot);
      announce({ name: firm.name, status: firm.status });
    },
    [layout, firms],
  );

  const onFocus = useCallback(() => {
    const st = useStore.getState();
    const plotIndex = st.framedPlot === 'overview' ? 0 : st.framedPlot;
    const plot = layout.plots[plotIndex] ?? layout.plots[0];
    if (!plot || !firms) return;
    const current = st.focusedCik === null ? -1 : firms.findIndex((f) => f.cik === st.focusedCik);
    if (current >= 0 && plot.stones.includes(current)) {
      // Already on a stone of this plot: just announce it again.
      focusStone(current);
      return;
    }
    const first = plot.stones[0];
    if (first !== undefined) focusStone(first);
  }, [layout, firms, focusStone]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !firms) return;
    const st = useStore.getState();
    const current = st.focusedCik === null ? -1 : firms.findIndex((f) => f.cik === st.focusedCik);

    const dir = ARROWS[e.key];
    if (dir !== undefined) {
      e.preventDefault();
      if (current < 0) return;
      const stone = layout.stones[current];
      if (!stone) return;
      const next = nextFocus(layout, stone.plot, current, dir);
      if (next !== null) focusStone(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const firm = current >= 0 ? firms[current] : undefined;
      if (firm) st.openCard(firm.cik, 'keyboard');
      return;
    }
    if (e.key === 'Escape' && st.cardCik !== null) {
      e.preventDefault();
      st.closeCard();
    }
  };

  if (layout.plots.length === 0) return null;

  return (
    <button
      type="button"
      className="sr-only"
      data-testid="stone-focus-proxy"
      {...{ [STONE_PROXY_ATTR]: '' }}
      aria-label={STONE_PROXY_LABEL}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    />
  );
}

export default StoneFocusProxy;
