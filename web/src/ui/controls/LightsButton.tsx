import { useRef } from 'react';
import { useStore } from '../../state/store';

/** Minimum time between accepted lights changes (at most 3 per second). */
export const LIGHTS_DEBOUNCE_MS = 350;

const btn =
  'rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';

/** Label names the mode the click switches to. */
export function lightsLabel(lights: 'on' | 'off'): string {
  return lights === 'on' ? 'Lights off' : 'Lights on';
}

/** HUD lights toggle. Clicks within 350 ms of the last accepted change are ignored. */
export function LightsButton() {
  const lights = useStore((s) => s.settings.lights);
  const setSetting = useStore((s) => s.setSetting);
  const lastChange = useRef(Number.NEGATIVE_INFINITY);

  const onClick = () => {
    const now = Date.now();
    if (now - lastChange.current < LIGHTS_DEBOUNCE_MS) return;
    lastChange.current = now;
    setSetting('lights', lights === 'on' ? 'off' : 'on');
  };

  return (
    <button type="button" className={btn} onClick={onClick}>
      {lightsLabel(lights)}
    </button>
  );
}
