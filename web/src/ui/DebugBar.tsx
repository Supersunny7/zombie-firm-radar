import { useId, useState } from 'react';
import { useStore } from '../state/store';
import type { GameState, Result } from '../state/types';

export interface DebugButtonStates {
  capture: boolean;
  lab: boolean;
  outcome: boolean;
  graveyard: boolean;
}

/**
 * Which debug buttons are enabled in a machine state, following the allowed transitions:
 * Capture = selectFirm, Lab = captureDone, Outcome = pullSwitch,
 * Graveyard = cancel (capture, lab) or continue (outcome).
 */
export function debugButtonStates(state: GameState): DebugButtonStates {
  return {
    capture: state === 'graveyard',
    lab: state === 'capture',
    outcome: state === 'lab',
    graveyard: state === 'capture' || state === 'lab' || state === 'outcome',
  };
}

const RESULTS: readonly Result[] = ['revived', 'undead', 'liquidated'];

const control =
  'rounded-panel border border-panel-border bg-panel px-2 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';
const button = `${control} disabled:cursor-not-allowed disabled:opacity-50`;

/** Developer bar for walking the game flow. Default export so it can be React.lazy loaded. */
export default function DebugBar() {
  const uid = useId();
  const state = useStore((s) => s.machine.state);
  const rateShock = useStore((s) => s.machine.ctx.rateShock);
  const firms = useStore((s) => s.data?.index.firms ?? []);
  const rejection = useStore((s) => s.lastRejection);
  const send = useStore((s) => s.send);
  const selectFirm = useStore((s) => s.selectFirm);
  const setRateShock = useStore((s) => s.setRateShock);
  const setResult = useStore((s) => s.setResult);

  const [cik, setCik] = useState('');
  const [result, setResultLocal] = useState<Result>('undead');
  const [shockText, setShockText] = useState<string | null>(null);

  const chosenCik = cik !== '' ? cik : (firms[0]?.cik ?? '');
  const enabled = debugButtonStates(state);
  const shockRejected = rejection?.event === 'setRateShock' ? rejection.reason : null;

  const graveyardEvent =
    state === 'outcome' ? { type: 'continue' as const } : { type: 'cancel' as const };

  return (
    <section
      aria-label="Debug bar"
      className="pointer-events-auto z-50 m-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-panel border border-panel-border bg-panel px-3 py-1.5 font-ui text-xs text-text min-[901px]:fixed min-[901px]:top-3 min-[901px]:left-1/2 min-[901px]:m-0 min-[901px]:w-max min-[901px]:max-w-[40vw] min-[901px]:-translate-x-1/2 max-[900px]:relative"
    >
      <span className="font-mono text-text-2">Debug</span>

      <label htmlFor={`${uid}-firm`} className="flex items-center gap-1">
        Firm
        <select
          id={`${uid}-firm`}
          className={control}
          value={chosenCik}
          onChange={(e) => setCik(e.target.value)}
        >
          {firms.map((f) => (
            <option key={f.cik} value={f.cik}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={button}
        disabled={!enabled.capture || chosenCik === ''}
        onClick={() => selectFirm(chosenCik)}
      >
        Capture
      </button>
      <button
        type="button"
        className={button}
        disabled={!enabled.lab}
        onClick={() => send({ type: 'captureDone' })}
      >
        Lab
      </button>
      <button
        type="button"
        className={button}
        disabled={!enabled.outcome}
        onClick={() => send({ type: 'pullSwitch', treatment: [], result })}
      >
        Outcome
      </button>
      <button
        type="button"
        className={button}
        disabled={!enabled.graveyard}
        onClick={() => send(graveyardEvent)}
      >
        Graveyard
      </button>

      <label htmlFor={`${uid}-shock`} className="flex items-center gap-1">
        Rate shock
        <input
          id={`${uid}-shock`}
          type="number"
          min={0}
          max={0.05}
          step={0.005}
          className={`${control} w-24 font-mono`}
          value={shockText ?? String(rateShock)}
          aria-invalid={shockRejected !== null}
          onChange={(e) => {
            setShockText(e.target.value);
            // Invalid values (empty, out of range) go through the store so the machine rejects them.
            setRateShock(e.target.value === '' ? Number.NaN : Number(e.target.value));
          }}
          onBlur={() => setShockText(null)}
        />
      </label>

      <label htmlFor={`${uid}-result`} className="flex items-center gap-1">
        Result
        <select
          id={`${uid}-result`}
          className={control}
          value={result}
          onChange={(e) => {
            const next = e.target.value as Result;
            setResultLocal(next);
            if (state === 'lab' || state === 'outcome') setResult(next);
          }}
        >
          {RESULTS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <span role="status" className="text-text-2">
        {shockRejected}
      </span>
    </section>
  );
}
