/**
 * Keyboard navigation between stones (pure). No React or three imports.
 * Directions are in ground x,z, matching the fixed camera orientation.
 */
import type { GraveyardLayout, PlotLayout } from './layout';

export type NavDir = 'left' | 'right' | 'up' | 'down';

/** Unit direction vectors in ground (x, z). */
const DIR: Readonly<Record<NavDir, readonly [number, number]>> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

/**
 * Next stone to focus when an arrow key is pressed.
 *
 * `plot` is a plot index or a PlotLayout; `current` is an index into
 * `layout.stones`. Candidates are stones of the same plot whose centre lies
 * within 45 degrees (inclusive) either side of the direction. The nearest by
 * ground-plane Euclidean distance wins; ties go to the lower reading-order
 * index. Returns an index into `layout.stones`, or null when nothing
 * qualifies (focus stays).
 */
export function nextFocus(
  layout: GraveyardLayout,
  plot: PlotLayout | number,
  current: number,
  dir: NavDir,
): number | null {
  const plotLayout = typeof plot === 'number' ? layout.plots[plot] : plot;
  const from = layout.stones[current];
  const vec = DIR[dir] as readonly [number, number] | undefined;
  if (!plotLayout || !from || !vec) return null;

  const [dx, dz] = vec;
  let best: number | null = null;
  let bestDist = Infinity;

  // plotLayout.stones is in reading order, so strict "<" keeps the lower index on ties.
  for (const idx of plotLayout.stones) {
    if (idx === current) continue;
    const s = layout.stones[idx];
    if (!s) continue;
    const vx = s.x - from.x;
    const vz = s.z - from.z;
    const along = vx * dx + vz * dz;
    const perp = Math.abs(vx * dz - vz * dx);
    // Inside the cone: forward and |perp| <= along (tan 45 = 1, inclusive).
    if (!(along > 0) || perp > along) continue;
    const dist = Math.hypot(vx, vz);
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  }
  return best;
}
