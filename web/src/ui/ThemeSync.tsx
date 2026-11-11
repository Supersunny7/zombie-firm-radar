import { useLayoutEffect } from 'react';

export interface ThemeSyncProps {
  lightsOn: boolean;
  reducedMotion: boolean;
}

/** Mirrors settings onto the root element so CSS variables switch without re-rendering the tree. */
export function ThemeSync({ lightsOn, reducedMotion }: ThemeSyncProps): null {
  useLayoutEffect(() => {
    document.documentElement.dataset.lights = lightsOn ? 'on' : 'off';
  }, [lightsOn]);

  useLayoutEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [reducedMotion]);

  return null;
}

export default ThemeSync;
