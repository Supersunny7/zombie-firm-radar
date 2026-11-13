import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useStore } from '../../../state/store';
import { initialMachine } from '../../../state/machine';
import type { TransitionOutcome } from '../../../state/types';
import { computeLayout } from '../layout/layout';
import { HorrorDebug, resetHorrorDebugForTests } from './HorrorDebug';

const FIRMS = Array.from({ length: 60 }, (_, i) => ({
  cik: String(i).padStart(10, '0'),
  sector: 'Services',
  status: (i % 2 === 0 ? 'zombie' : 'healthy') as 'zombie' | 'healthy',
  total_debt_usd: 1,
}));
const LAYOUT = computeLayout(FIRMS);
const originalSetRateShock = useStore.getState().setRateShock;

let setRateShock: Mock<(value: unknown) => TransitionOutcome>;

beforeEach(() => {
  resetHorrorDebugForTests();
  window.history.replaceState(null, '', '/?shock=0.25');
  // Wrap the real action so the machine still moves and the slider value can be checked too.
  setRateShock = vi.fn((value: unknown) => originalSetRateShock(value));
  useStore.setState({
    data: { index: { firms: FIRMS } } as never,
    machine: initialMachine(),
    setRateShock,
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  useStore.setState({ data: null, machine: initialMachine(), setRateShock: originalSetRateShock });
});

describe('HorrorDebug remount (Requirement 25, H2)', () => {
  it('applies ?shock= once per page load, not again when the scene tree remounts', () => {
    const first = render(<HorrorDebug layout={LAYOUT} />);
    expect(setRateShock).toHaveBeenCalledTimes(1);
    expect(setRateShock).toHaveBeenCalledWith(0.0025);

    // The user moves the slider, then the scene remounts (e.g. canvasKey bump on webglcontextrestored).
    act(() => void originalSetRateShock(0.01));
    first.unmount();
    render(<HorrorDebug layout={LAYOUT} />);

    expect(setRateShock).toHaveBeenCalledTimes(1);
    expect(useStore.getState().machine.ctx.rateShock).toBe(0.01);
  });

  it('applies ?shock= again after the test-only reset, which stands for a new page load', () => {
    render(<HorrorDebug layout={LAYOUT} />);
    cleanup();
    resetHorrorDebugForTests();
    render(<HorrorDebug layout={LAYOUT} />);
    expect(setRateShock).toHaveBeenCalledTimes(2);
  });
});
