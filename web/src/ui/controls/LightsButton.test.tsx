// Requirement 25 (graveyard-horror-pass): the Lights toggle leaves the rate shock alone.
// jsdom limit (design section 8): these tests pass on the code before the H2 fix too,
// because the suspected causes (layout overlap, HorrorDebug remount) are outside the HUD.
// No Settled_Shock exists yet (Batch 3 adds model/settle.ts), so "no Settled_Shock" is
// checked as "no write to machine.ctx.rateShock at all": a settled shock can only follow
// from a rate-shock write.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialMachine } from '../../state/machine';
import { DEFAULT_SETTINGS } from '../../state/settings';
import { useStore } from '../../state/store';
import { LIGHTS_DEBOUNCE_MS, LightsButton } from './LightsButton';
import { SHOCK_STEPS, ShockSlider, shockPoints, shockValue } from './ShockSlider';

/** Window after each activation in which the rate shock must stay bit-equal (25.1). */
const HOLD_MS = 500;

function reset(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS, lights: 'off' },
    audioBlocked: false,
  });
}

beforeEach(reset);
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  reset();
});

/** Render the Lights button next to the slider, as in the HUD. */
function renderHud() {
  render(
    <>
      <LightsButton />
      <ShockSlider />
    </>,
  );
  return {
    button: screen.getByRole('button', { name: /^Lights (on|off)$/ }),
    slider: screen.getByRole('slider', { name: 'Interest rate shock' }),
  };
}

/** Records every machine replacement, i.e. every accepted machine event. */
function recordMachineWrites(): { writes: number[]; stop: () => void } {
  const writes: number[] = [];
  const stop = useStore.subscribe((s, prev) => {
    if (s.machine !== prev.machine) writes.push(s.machine.ctx.rateShock);
  });
  return { writes, stop };
}

type Activation = 'pointer' | 'Enter' | 'Space';

async function activate(
  how: Activation,
  user: ReturnType<typeof userEvent.setup>,
  button: HTMLElement,
): Promise<void> {
  if (how === 'pointer') {
    await user.click(button);
    return;
  }
  act(() => button.focus());
  await user.keyboard(how === 'Enter' ? '{Enter}' : ' ');
}

// 0 pp, and 2.25 pp (step 9, stored 9 / 400 = 0.0225): in (0, 5] and not 0.25.
const START_STEPS = [0, 9] as const;
const ACTIVATIONS: Activation[] = ['pointer', 'Enter', 'Space'];

describe('LightsButton leaves the rate shock alone (Requirement 25.1, 25.4)', () => {
  it('holds longer than the debounce, so successive activations are accepted', () => {
    expect(HOLD_MS).toBeGreaterThan(LIGHTS_DEBOUNCE_MS);
  });

  for (const how of ACTIVATIONS) {
    for (const k of START_STEPS) {
      it(`${how} activation at +${shockPoints(k)} pp keeps rateShock bit-equal for 500 ms and switches Lights_Mode`, async () => {
        // shouldAdvanceTime: RTL's async wrapper awaits a setTimeout(0) that it only
        // flushes for Jest fake timers; letting the fake clock follow real time unblocks it.
        vi.useFakeTimers({ shouldAdvanceTime: true });
        if (k > 0) useStore.getState().setRateShock(shockValue(k));
        const before = useStore.getState().machine.ctx.rateShock;
        expect(before).toBe(shockValue(k));

        const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
        const { button, slider } = renderHud();
        const { writes, stop } = recordMachineWrites();

        // Off -> on, then on -> off: both directions, spaced by HOLD_MS (> 350 ms debounce).
        for (const next of ['on', 'off'] as const) {
          await activate(how, user, button);
          expect(useStore.getState().settings.lights).toBe(next);
          act(() => void vi.advanceTimersByTime(HOLD_MS));

          const after = useStore.getState().machine.ctx.rateShock;
          expect(Object.is(after, before)).toBe(true);
          expect(slider).toHaveValue(String(k));
          expect(slider).toHaveAttribute('aria-valuetext', `+${shockPoints(k)} percentage points`);
          expect(useStore.getState().settings.lights).toBe(next);
        }

        stop();
        expect(writes).toEqual([]);
      });
    }
  }
});

describe('ShockSlider keys and drag still change the value (Requirement 25.2, preservation)', () => {
  // jsdom does not step a range input on key presses. The test checks that no handler
  // cancels the key (so the browser still steps the thumb) and that the change event the
  // browser then fires stores the new step.
  const KEYS: { key: string; from: number; to: number }[] = [
    { key: 'ArrowRight', from: 9, to: 10 },
    { key: 'ArrowUp', from: 9, to: 10 },
    { key: 'ArrowLeft', from: 9, to: 8 },
    { key: 'ArrowDown', from: 9, to: 8 },
    { key: 'Home', from: 9, to: 0 },
    { key: 'End', from: 9, to: SHOCK_STEPS },
  ];

  for (const { key, from, to } of KEYS) {
    it(`${key} on the focused slider moves step ${from} to ${to}`, () => {
      useStore.getState().setRateShock(shockValue(from));
      const { slider } = renderHud();
      act(() => slider.focus());
      expect(slider).toHaveFocus();

      const notCancelled = fireEvent.keyDown(slider, { key });
      expect(notCancelled).toBe(true);
      fireEvent.change(slider, { target: { value: String(to) } });
      fireEvent.keyUp(slider, { key });

      expect(useStore.getState().machine.ctx.rateShock).toBe(shockValue(to));
      expect(slider).toHaveValue(String(to));
      expect(useStore.getState().settings.lights).toBe('off');
    });
  }

  it('drag (change events) moves the value step by step', () => {
    const { slider } = renderHud();
    for (const k of [1, 4, 9, 20, 0]) {
      fireEvent.change(slider, { target: { value: String(k) } });
      expect(useStore.getState().machine.ctx.rateShock).toBe(shockValue(k));
      expect(slider).toHaveValue(String(k));
    }
  });
});
