import { useEffect, useRef, useState } from 'react';
import { useShockView } from '../../state/shockView';
import { ShockSlider } from '../controls/ShockSlider';

export const RISEN_THROTTLE_MS = 1000;

/** Leading + trailing throttle: at most one visible change per `ms`. */
export function useThrottledValue<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const lastAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wait = lastAt.current + ms - Date.now();
    if (timer.current !== null) clearTimeout(timer.current);
    if (wait <= 0) {
      lastAt.current = Date.now();
      timer.current = null;
      setShown(value);
      return;
    }
    timer.current = setTimeout(() => {
      lastAt.current = Date.now();
      timer.current = null;
      setShown(value);
    }, wait);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [value, ms]);

  return shown;
}

/** Shock slider plus counters, all from the shared shock view. */
export function ShockPanel() {
  const { batch } = useShockView();
  const { risen, alreadyUndead, notEligible } = batch.counts;
  const risenShown = useThrottledValue(risen, RISEN_THROTTLE_MS);

  return (
    <section
      aria-label="Interest rate shock"
      className="pointer-events-auto flex w-full flex-col gap-4 rounded-panel border border-panel-border bg-panel p-4 font-ui text-text min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-8"
    >
      <div className="min-w-0 flex-1">
        <ShockSlider />
      </div>
      <div className="flex shrink-0 flex-col gap-1 font-mono min-[900px]:items-end min-[900px]:text-right">
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-col min-[900px]:items-end"
        >
          <span data-testid="risen-count" className="text-5xl leading-none text-rec">
            {risenShown}
          </span>
          <span className="text-xs tracking-wider text-text-2 uppercase">Risen from the grave</span>
        </p>
        <p className="text-xs text-text-2">{alreadyUndead} already undead</p>
        {notEligible > 0 && <p className="text-xs text-text-2">{notEligible} not shock-eligible</p>}
      </div>
    </section>
  );
}
