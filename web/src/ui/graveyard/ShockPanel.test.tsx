import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ShockPanel } from './ShockPanel';
import { GraveyardHud } from './GraveyardHud';
import { useStore } from '../../state/store';
import { initialMachine } from '../../state/machine';
import type { FirmIndexEntry } from '../../types/data';

const firm = (n: number, over: Partial<FirmIndexEntry>): FirmIndexEntry =>
  ({
    cik: String(n).padStart(10, '0'),
    status: 'healthy',
    age_years: 20,
    latest_icr: 1.2,
    total_debt_usd: 100_000_000,
    implied_rate: 0.05,
    shock_eligible: true,
    ...over,
  }) as unknown as FirmIndexEntry;

function load(firms: FirmIndexEntry[], rateShock: number): void {
  useStore.setState({
    data: { index: { firms } } as never,
    machine: { ...initialMachine(), ctx: { ...initialMachine().ctx, rateShock } } as never,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useStore.setState({ data: null, machine: initialMachine() });
});

describe('ShockPanel', () => {
  it('shows counters from the batch and hides the ineligible line at zero', () => {
    load([firm(1, { latest_icr: 0.5, status: 'zombie' })], 0);
    render(<ShockPanel />);
    expect(screen.getByText(/Risen from the grave: 0/)).toBeInTheDocument();
    expect(screen.getByText('1 already undead')).toBeInTheDocument();
    expect(screen.queryByText(/not shock-eligible/)).not.toBeInTheDocument();
  });

  it('shows the ineligible line when N > 0', () => {
    load([firm(1, { shock_eligible: false })], 0);
    render(<ShockPanel />);
    expect(screen.getByText('1 not shock-eligible')).toBeInTheDocument();
  });

  it('throttles the polite Risen counter to one update per second', () => {
    load([firm(1, {})], 0);
    render(<ShockPanel />);
    act(() => load([firm(1, {})], 0.0125)); // risen 1, within the first second
    expect(screen.getByText(/Risen from the grave: 0/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Risen from the grave: 1/)).toBeInTheDocument();
  });

  it('has no axe violations inside the HUD', async () => {
    vi.useRealTimers();
    load([firm(1, {})], 0);
    const { container } = render(<GraveyardHud />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
