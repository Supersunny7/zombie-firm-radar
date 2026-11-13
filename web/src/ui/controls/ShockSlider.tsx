import { useId } from 'react';
import { useStore } from '../../state/store';

export const SHOCK_STEPS = 20;

/** Tick labels every 1 pp, 0 to +5 pp. Decorative: the slider has aria-valuetext. */
const TICKS = ['0', '+1', '+2', '+3', '+4', '+5 pp'];

/** Percentage points for slider step k, formatted with exactly two decimals. */
export function shockPoints(k: number): string {
  return (k * 0.25).toFixed(2);
}

/** Stored decimal rate shock for slider step k. */
export function shockValue(k: number): number {
  return k / 400;
}

/** Slider step for a stored rate shock, clamped to 0..20. */
export function shockStep(value: number): number {
  return Math.min(SHOCK_STEPS, Math.max(0, Math.round(value * 400)));
}

/** Interest rate shock slider: 21 steps of 0.25 percentage points, 0 to +5.00 pp. */
export function ShockSlider() {
  const id = useId();
  const rateShock = useStore((s) => s.machine.ctx.rateShock);
  const setRateShock = useStore((s) => s.setRateShock);
  const k = shockStep(rateShock);
  const pp = shockPoints(k);

  return (
    <div className="flex flex-col gap-1 text-text">
      <label htmlFor={id} className="font-mono text-sm">
        IF INTEREST RATES RISE BY +{pp} pp
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={SHOCK_STEPS}
        step={1}
        value={k}
        aria-label="Interest rate shock"
        aria-valuetext={`+${pp} percentage points`}
        className="w-full accent-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        onChange={(e) => setRateShock(shockValue(Number(e.target.value)))}
      />
      <div
        aria-hidden="true"
        data-testid="shock-ticks"
        className="flex justify-between font-mono text-xs text-text-2"
      >
        {TICKS.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <p className="text-xs text-text-2">
        Approximation based on index data; simplified rate shock
      </p>
      <p className="text-xs text-text-2">Debt reprices at once; simplified model</p>
    </div>
  );
}
