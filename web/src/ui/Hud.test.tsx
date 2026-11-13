import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { LoadedData } from '../data/loader';
import { fixtureBundle } from '../dev/fixtures';
import { initialMachine } from '../state/machine';
import { DEFAULT_SETTINGS } from '../state/settings';
import { useStore } from '../state/store';
import { FOOTER_TEXT, Hud } from './Hud';

const CIK = '9000000001'.padStart(10, '0');

function reset(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    data: null,
    skipHandler: null,
    lastRejection: null,
  });
}

function dataWith(source: LoadedData['source']): LoadedData {
  return { index: fixtureBundle.index, macro: fixtureBundle.macro, source };
}

function toState(state: 'graveyard' | 'capture' | 'lab' | 'outcome'): void {
  const s = useStore.getState();
  if (state === 'graveyard') return;
  s.selectFirm(CIK);
  if (state === 'capture') return;
  s.send({ type: 'captureDone' });
  if (state === 'lab') return;
  s.send({ type: 'pullSwitch', treatment: [], result: 'undead' });
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  reset();
});

describe('Hud', () => {
  it('shows the REC text', () => {
    render(<Hud />);
    expect(screen.getByText(/REC/)).toBeInTheDocument();
  });

  it('shows the plot label and the overview label next to REC', () => {
    const firms = [
      { cik: '0000000001', sector: 'Retail Trade', status: 'healthy', total_debt_usd: 1e8 },
      { cik: '0000000002', sector: 'Manufacturing', status: 'healthy', total_debt_usd: 1e8 },
    ];
    useStore.setState({ data: { index: { firms }, source: 'real' } as never, framedPlot: 1 });
    render(<Hud />);
    expect(screen.getByTestId('cam-label')).toHaveTextContent(
      '\u2014 PLOT 2 \u2014 RETAIL TRADE \u00b7 1 GRAVES',
    );
    act(() => useStore.getState().setFramedPlot('overview'));
    expect(screen.getByTestId('cam-label')).toHaveTextContent('OVERVIEW \u00b7 2 PLOTS');
    useStore.setState({ framedPlot: 0 });
  });

  it('shows no plot label without firms', () => {
    render(<Hud />);
    expect(screen.queryByTestId('cam-label')).not.toBeInTheDocument();
  });

  it.each(['graveyard', 'capture', 'lab', 'outcome'] as const)(
    'shows the footer in the %s state',
    (state) => {
      toState(state);
      expect(useStore.getState().machine.state).toBe(state);
      render(<Hud />);
      expect(screen.getByText(FOOTER_TEXT)).toBeVisible();
      expect(FOOTER_TEXT).toBe('Data: SEC EDGAR. Not investment advice.');
    },
  );

  it('shows the footer with the Table overlay open', () => {
    useStore.setState({ overlay: 'table' });
    render(<Hud />);
    expect(screen.getByText(FOOTER_TEXT)).toBeVisible();
  });

  it.each([
    ['mock', 'Mock data'],
    ['fixture', 'Sample data'],
    ['sample', 'Sample data'],
  ] as const)('shows the data label for %s', (source, label) => {
    useStore.setState({ data: dataWith(source) });
    render(<Hud />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('hides the Mock data label for real data and while the source is unknown', () => {
    useStore.setState({ data: dataWith('real') });
    const { unmount } = render(<Hud />);
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument();
    unmount();
    useStore.setState({ data: null });
    render(<Hud />);
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument();
  });

  it('hides the Skip slot and marks it aria-disabled without a handler', () => {
    render(<Hud />);
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
    const hidden = screen.getByText('Skip', { selector: 'button' });
    expect(hidden).not.toBeVisible();
    expect(hidden).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the Skip slot with a handler, and Esc calls it once', async () => {
    const handler = vi.fn();
    render(<Hud />);
    act(() => useStore.getState().registerSkip(handler));
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip).toBeVisible();
    expect(skip).not.toHaveAttribute('aria-disabled');
    await userEvent.keyboard('{Escape}');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('makes the skip link the first focusable element', async () => {
    render(<Hud />);
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Skip to table view' })).toHaveFocus();
  });

  it('is axe-clean', async () => {
    useStore.setState({ data: dataWith('mock') });
    const { container } = render(<Hud />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
