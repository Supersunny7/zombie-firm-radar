import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { fixtureBundle, fixtureMacro } from '../dev/fixtures';
import { initialMachine } from '../state/machine';
import { DEFAULT_SETTINGS } from '../state/settings';
import { initialDebugBar, useStore } from '../state/store';
import type { GameState } from '../state/types';
import DebugBar, { debugButtonStates } from './DebugBar';

const STATES: GameState[] = ['graveyard', 'capture', 'lab', 'outcome'];

function reset(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    lastRejection: null,
    data: { index: fixtureBundle.index, macro: fixtureMacro, source: 'fixture' },
  });
}

/** Drive the real machine to a state through the store. */
function goTo(state: GameState): void {
  const s = useStore.getState();
  const cik = fixtureBundle.index.firms[0]?.cik;
  if (state === 'graveyard') return;
  s.selectFirm(cik);
  if (state === 'capture') return;
  useStore.getState().send({ type: 'captureDone' });
  if (state === 'lab') return;
  useStore.getState().send({ type: 'pullSwitch', treatment: [], result: 'undead' });
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  reset();
});

const buttonNames = ['Capture', 'Lab', 'Outcome', 'Graveyard'] as const;

describe('debugButtonStates', () => {
  it.each([
    ['graveyard', { capture: true, lab: false, outcome: false, graveyard: false }],
    ['capture', { capture: false, lab: true, outcome: false, graveyard: true }],
    ['lab', { capture: false, lab: false, outcome: true, graveyard: true }],
    ['outcome', { capture: false, lab: false, outcome: false, graveyard: true }],
  ] as const)('%s', (state, expected) => {
    expect(debugButtonStates(state)).toEqual(expected);
  });
});

describe('DebugBar buttons', () => {
  it.each(STATES)('renders buttons enabled as debugButtonStates says in %s', (state) => {
    goTo(state);
    expect(useStore.getState().machine.state).toBe(state);
    render(<DebugBar />);
    const expected = debugButtonStates(state);
    const byName = {
      Capture: expected.capture,
      Lab: expected.lab,
      Outcome: expected.outcome,
      Graveyard: expected.graveyard,
    };
    for (const name of buttonNames) {
      const btn = screen.getByRole('button', { name });
      if (byName[name]) expect(btn).toBeEnabled();
      else expect(btn).toBeDisabled();
    }
  });

  it('walks the flow with the buttons', async () => {
    const user = userEvent.setup();
    render(<DebugBar />);
    await user.click(screen.getByRole('button', { name: 'Capture' }));
    expect(useStore.getState().machine.state).toBe('capture');
    await user.click(screen.getByRole('button', { name: 'Lab' }));
    expect(useStore.getState().machine.state).toBe('lab');
    await user.click(screen.getByRole('button', { name: 'Outcome' }));
    expect(useStore.getState().machine.state).toBe('outcome');
    await user.click(screen.getByRole('button', { name: 'Graveyard' }));
    expect(useStore.getState().machine.state).toBe('graveyard');
  });

  it('lists the fixture firms and captures the chosen one', async () => {
    const user = userEvent.setup();
    render(<DebugBar />);
    const select = screen.getByRole('combobox', { name: 'Firm' });
    const firms = fixtureBundle.index.firms;
    expect(select.querySelectorAll('option')).toHaveLength(firms.length);
    const last = firms[firms.length - 1]!;
    await user.selectOptions(select, last.cik);
    await user.click(screen.getByRole('button', { name: 'Capture' }));
    expect(useStore.getState().machine.ctx.cik).toBe(last.cik);
  });
});

describe('DebugBar rate shock', () => {
  it('has a number input limited to 0..0.05', () => {
    render(<DebugBar />);
    const input = screen.getByRole('spinbutton', { name: 'Rate shock' });
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '0.05');
  });

  it('accepts an in-range value', () => {
    render(<DebugBar />);
    const input = screen.getByRole('spinbutton', { name: 'Rate shock' });
    fireEvent.change(input, { target: { value: '0.03' } });
    expect(useStore.getState().machine.ctx.rateShock).toBe(0.03);
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it.each(['0.06', '-0.01'])('rejects out-of-range %s and shows the reason', (value) => {
    render(<DebugBar />);
    const input = screen.getByRole('spinbutton', { name: 'Rate shock' });
    fireEvent.change(input, { target: { value: '0.02' } });
    fireEvent.change(input, { target: { value } });
    expect(useStore.getState().machine.ctx.rateShock).toBe(0.02);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Rate shock must be between 0 and 0.05');
  });

  it('rejects an empty value and shows the reason', () => {
    render(<DebugBar />);
    const input = screen.getByRole('spinbutton', { name: 'Rate shock' });
    fireEvent.change(input, { target: { value: '0.02' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(useStore.getState().machine.ctx.rateShock).toBe(0.02);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Rate shock must be a finite number');
  });
});

describe('DebugBar result picker', () => {
  it('offers revived, undead and liquidated', () => {
    render(<DebugBar />);
    const select = screen.getByRole('combobox', { name: 'Result' });
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(values).toEqual(['revived', 'undead', 'liquidated']);
  });

  it('sets the result on the machine when in the lab', async () => {
    const user = userEvent.setup();
    goTo('lab');
    render(<DebugBar />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Result' }), 'liquidated');
    expect(useStore.getState().machine.ctx.result).toBe('liquidated');
  });

  it('uses the picked result when pulling the switch', async () => {
    const user = userEvent.setup();
    goTo('capture');
    useStore.getState().send({ type: 'captureDone' });
    render(<DebugBar />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Result' }), 'revived');
    await user.click(screen.getByRole('button', { name: 'Outcome' }));
    expect(useStore.getState().machine.state).toBe('outcome');
    expect(useStore.getState().machine.ctx.result).toBe('revived');
  });
});

describe('DebugBar accessibility', () => {
  it.each(STATES)('has no axe violations in %s', async (state) => {
    goTo(state);
    const { container } = render(<DebugBar />);
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('debug bar visibility', () => {
  it('is hidden in production without debug=1', () => {
    expect(initialDebugBar(false, '')).toBe(false);
    expect(initialDebugBar(false, '?other=1')).toBe(false);
  });

  it('is shown in production with ?debug=1', () => {
    expect(initialDebugBar(false, '?debug=1')).toBe(true);
  });

  it('is shown in development', () => {
    expect(initialDebugBar(true, '')).toBe(true);
  });
});
