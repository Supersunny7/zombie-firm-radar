import { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../../state/store';
import { buildGrid } from '../layout/grid';
import type { GraveyardLayout } from '../layout/layout';
import { VISIBLE_RADIUS, visibleStones } from '../layout/visible';

/** Camera height above which the whole layout is written (overview); same as Stones. */
const OVERVIEW_Y = 25;
const KEY_CELL = 4;

/**
 * Set of firm indices near the camera (instance compaction, same rule as Stones). The camera is
 * snapped to a 4 m cell so React state changes only when the camera crosses a cell.
 */
export function useVisibleStones(layout: GraveyardLayout): ReadonlySet<number> {
  const lights = useStore((s) => s.settings.lights);
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const [focus, setFocus] = useState({ x: 0, z: 0, overview: false });

  useFrame(({ camera }) => {
    const x = Math.round(camera.position.x / KEY_CELL) * KEY_CELL;
    const z = Math.round(camera.position.z / KEY_CELL) * KEY_CELL;
    const overview = camera.position.y > OVERVIEW_Y;
    setFocus((f) => (f.x === x && f.z === z && f.overview === overview ? f : { x, z, overview }));
  });

  return useMemo(() => {
    const radius = focus.overview ? Infinity : VISIBLE_RADIUS[lights];
    return new Set(visibleStones(grid, focus.x, focus.z, radius));
  }, [grid, focus, lights]);
}
