import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { StoneFocusProxy, STONE_PROXY_LABEL } from './StoneFocusProxy';
import { FileCard } from './FileCard';
import { useStore } from '../../state/store';
import type { FirmIndexEntry } from '../../types/data';

const firm = (n: number, sector: string): FirmIndexEntry =>
  ({
    cik: String(n).padStart(10, '0'),
    name: `Firm ${n}`,
    sector,
    status: 'healthy',
    total_debt_usd: 1e8,
  }) as unknown as FirmIndexEntry;

// Plots are ordered by sector name: Manufacturing (plot 0: firms 1, 2), Retail Trade (plot 1: firm 3).
const FIRMS = [firm(1, 'Manufacturing'), firm(2, 'Manufacturing'), firm(3, 'Retail Trade')];

beforeEach(() => {
  useStore.setState({
    data: { index: { firms: FIRMS } } as never,
    framedPlot: 0,
    focusedCik: null,
  });
});
afterEach(() => {
  cleanup();
  useStore.setState({
    data: null,
    framedPlot: 0,
    focusedCik: null,
    cardCik: null,
    cardOpener: null,
    liveMessage: '',
  });
});

describe('StoneFocusProxy', () => {
  it('has an accessible name and is a single tab stop', () => {
    render(<StoneFocusProxy />);
    expect(screen.getByRole('button', { name: STONE_PROXY_LABEL })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('Tab focuses the proxy and focuses the first stone of the framed plot', async () => {
    render(<StoneFocusProxy />);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: STONE_PROXY_LABEL }));
    expect(useStore.getState().focusedCik).toBe('0000000001');
  });

  it('uses plot 1 in the overview and the framed plot otherwise', async () => {
    useStore.setState({ framedPlot: 'overview' });
    const first = render(<StoneFocusProxy />);
    await userEvent.tab();
    expect(useStore.getState().focusedCik).toBe('0000000001');
    first.unmount();

    useStore.setState({ framedPlot: 1, focusedCik: null });
    render(<StoneFocusProxy />);
    await userEvent.tab();
    expect(useStore.getState().focusedCik).toBe('0000000003');
  });

  it('keeps an already focused stone of the plot, also after blur', async () => {
    useStore.setState({ focusedCik: '0000000002' });
    render(
      <>
        <StoneFocusProxy />
        <button type="button">next</button>
      </>,
    );
    await userEvent.tab();
    expect(useStore.getState().focusedCik).toBe('0000000002');
    await userEvent.tab();
    expect(useStore.getState().focusedCik).toBe('0000000002');
  });

  it('announces "{name}, {status}" on Tab-in', async () => {
    render(<StoneFocusProxy />);
    await userEvent.tab();
    expect(useStore.getState().liveMessage).toBe('Firm 1, Healthy');
  });

  it('arrows move focus to the nearest stone in that direction, or stay at the edge', async () => {
    render(<StoneFocusProxy />);
    await userEvent.tab();
    const start = useStore.getState().focusedCik;
    // Firm 1 and 2 share plot 0; one direction reaches the other, the opposite one stays.
    const moved: string[] = [];
    for (const key of ['{ArrowLeft}', '{ArrowRight}', '{ArrowUp}', '{ArrowDown}']) {
      await userEvent.keyboard(key);
      moved.push(useStore.getState().focusedCik ?? 'null');
      useStore.setState({ focusedCik: start });
    }
    expect(moved.some((c) => c === '0000000002')).toBe(true);
    expect(moved.every((c) => c === '0000000001' || c === '0000000002')).toBe(true);
    // Stays at the edge: the moved-to stone has no further neighbour in the same direction.
    const key = ['{ArrowLeft}', '{ArrowRight}', '{ArrowUp}', '{ArrowDown}'][
      moved.indexOf('0000000002')
    ] as string;
    await userEvent.keyboard(key);
    expect(useStore.getState().focusedCik).toBe('0000000002');
    await userEvent.keyboard(key);
    expect(useStore.getState().focusedCik).toBe('0000000002');
    expect(useStore.getState().liveMessage).toBe('Firm 2, Healthy');
  });

  it('Enter opens the card and moves focus into it; Esc closes and returns to the proxy', async () => {
    render(
      <>
        <StoneFocusProxy />
        <FileCard />
      </>,
    );
    await userEvent.tab();
    const proxy = screen.getByRole('button', { name: STONE_PROXY_LABEL });
    await userEvent.keyboard('{Enter}');
    expect(useStore.getState().cardCik).toBe('0000000001');
    expect(useStore.getState().cardOpener).toBe('keyboard');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    expect(useStore.getState().cardCik).toBeNull();
    expect(document.activeElement).toBe(proxy);
  });

  it('Space opens the card too', async () => {
    render(<StoneFocusProxy />);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(useStore.getState().cardCik).toBe('0000000001');
  });

  it('frames the stone plot when focus enters it from the overview', async () => {
    useStore.setState({ framedPlot: 'overview' });
    render(<StoneFocusProxy />);
    await userEvent.tab();
    expect(useStore.getState().framedPlot).toBe(0);
  });

  it('frames the plot of a focused stone that lies outside the framed plot', async () => {
    useStore.setState({ framedPlot: 1, focusedCik: '0000000003' });
    render(<StoneFocusProxy />);
    await userEvent.tab();
    expect(useStore.getState().framedPlot).toBe(1);
    useStore.setState({ framedPlot: 0 });
    const proxy = screen.getByRole('button', { name: STONE_PROXY_LABEL });
    proxy.blur();
    proxy.focus();
    // Framed plot 0 has no focused stone, so focus lands on its first stone.
    expect(useStore.getState().focusedCik).toBe('0000000001');
    expect(useStore.getState().framedPlot).toBe(0);
  });

  it('renders nothing without data and is axe-clean with data', async () => {
    const { container } = render(<StoneFocusProxy />);
    expect((await axe(container)).violations).toEqual([]);
    cleanup();
    useStore.setState({ data: null });
    const empty = render(<StoneFocusProxy />);
    expect(empty.container.firstChild).toBeNull();
  });
});
