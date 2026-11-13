import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initialMachine } from '../../state/machine';
import { useStore } from '../../state/store';
import { ShockSlider } from './ShockSlider';

beforeEach(() => useStore.setState({ machine: initialMachine() }));
afterEach(() => {
  cleanup();
  useStore.setState({ machine: initialMachine() });
});

describe('ShockSlider', () => {
  it('renders name, label, value text and static lines at 0', () => {
    render(<ShockSlider />);
    const slider = screen.getByRole('slider', { name: 'Interest rate shock' });
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '20');
    expect(slider).toHaveAttribute('aria-valuetext', '+0.00 percentage points');
    expect(screen.getByText('IF INTEREST RATES RISE BY +0.00 pp')).toBeInTheDocument();
    expect(
      screen.getByText('Approximation based on index data; simplified rate shock'),
    ).toBeInTheDocument();
    expect(screen.getByText('Debt reprices at once; simplified model')).toBeInTheDocument();
  });

  it('shows decorative tick labels 0 to +5 pp', () => {
    render(<ShockSlider />);
    const ticks = screen.getByTestId('shock-ticks');
    expect(ticks).toHaveAttribute('aria-hidden', 'true');
    expect(ticks.textContent).toBe('0+1+2+3+4+5 pp');
  });

  it('stores k / 400 and updates label and value text', () => {
    render(<ShockSlider />);
    const slider = screen.getByRole('slider', { name: 'Interest rate shock' });
    fireEvent.change(slider, { target: { value: '7' } });
    expect(useStore.getState().machine.ctx.rateShock).toBe(7 / 400);
    expect(slider).toHaveAttribute('aria-valuetext', '+1.75 percentage points');
    expect(screen.getByText('IF INTEREST RATES RISE BY +1.75 pp')).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '20' } });
    expect(useStore.getState().machine.ctx.rateShock).toBe(0.05);
    expect(screen.getByText('IF INTEREST RATES RISE BY +5.00 pp')).toBeInTheDocument();
  });
});
