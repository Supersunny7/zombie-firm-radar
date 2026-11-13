import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { PlotNav } from './PlotNav';
import { useStore } from '../../state/store';
import type { FirmIndexEntry } from '../../types/data';

const firm = (n: number, sector: string): FirmIndexEntry =>
  ({
    cik: String(n).padStart(10, '0'),
    sector,
    status: 'healthy',
    total_debt_usd: 1e8,
  }) as unknown as FirmIndexEntry;

beforeEach(() => {
  useStore.setState({
    data: {
      index: { firms: [firm(1, 'Retail Trade'), firm(2, 'Manufacturing'), firm(3, 'Services')] },
    } as never,
    framedPlot: 0,
    focusedCik: null,
  });
});
afterEach(() => {
  cleanup();
  useStore.setState({ data: null, framedPlot: 0, focusedCik: null });
});

describe('PlotNav', () => {
  it('renders one chip per plot in sorted sector order with aria-pressed', () => {
    render(<PlotNav />);
    const chips = screen.getAllByRole('button').slice(1);
    expect(chips.map((c) => c.textContent)).toEqual([
      '1. Manufacturing',
      '2. Retail Trade',
      '3. Services',
    ]);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
    expect(chips[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses the dark thin scrollbar class on the chip row', () => {
    render(<PlotNav />);
    expect(screen.getByRole('navigation', { name: 'Plots' })).toHaveClass('scrollbar-dark');
  });

  it('scrolls a chip into view on focus', () => {
    render(<PlotNav />);
    const chip = screen.getByRole('button', { name: '3. Services' });
    const spy = vi.fn();
    chip.scrollIntoView = spy;
    chip.focus();
    expect(spy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('chip click frames the plot and Overview frames the overview', async () => {
    render(<PlotNav />);
    await userEvent.click(screen.getByRole('button', { name: '3. Services' }));
    expect(useStore.getState().framedPlot).toBe(2);
    await userEvent.click(screen.getByRole('button', { name: /Overview/ }));
    expect(useStore.getState().framedPlot).toBe('overview');
    expect(screen.getByRole('button', { name: /Overview/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('arrow keys move and clamp at both ends', async () => {
    render(<PlotNav />);
    await userEvent.keyboard('{ArrowLeft}');
    expect(useStore.getState().framedPlot).toBe(0);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(useStore.getState().framedPlot).toBe(2);
  });

  it('ignores arrows while the stone proxy is the active element', async () => {
    render(
      <>
        <button type="button" data-stone-proxy="" aria-label="proxy" />
        <PlotNav />
      </>,
    );
    screen.getByRole('button', { name: 'proxy' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(useStore.getState().framedPlot).toBe(0);
  });

  it('arrows work again after focus leaves the proxy, even if focusedCik is set', async () => {
    useStore.setState({ focusedCik: '0000000001' });
    render(
      <>
        <button type="button" data-stone-proxy="" aria-label="proxy" />
        <PlotNav />
      </>,
    );
    screen.getByRole('button', { name: 'proxy' }).focus();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(useStore.getState().framedPlot).toBe(1);
  });

  it('ignores arrows while typing in an input', async () => {
    render(
      <>
        <input aria-label="q" />
        <PlotNav />
      </>,
    );
    await userEvent.type(screen.getByLabelText('q'), '{ArrowRight}');
    expect(useStore.getState().framedPlot).toBe(0);
  });

  it('renders nothing without data and is axe-clean with data', async () => {
    const { container, unmount } = render(<PlotNav />);
    expect((await axe(container)).violations).toEqual([]);
    unmount();
    useStore.setState({ data: null });
    const r = render(<PlotNav />);
    expect(r.container).toBeEmptyDOMElement();
  });
});
