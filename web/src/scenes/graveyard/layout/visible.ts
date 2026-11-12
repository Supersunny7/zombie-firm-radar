/**
 * Instance compaction (pure, no React or three imports). Returns the stone indices to write
 * into the instance buffers: every stone within `radius` metres of the focus on the ground,
 * or all stones when the radius is not finite (overview).
 */
import { queryRadius, type Grid } from './grid';

export function visibleStones(grid: Grid, x: number, z: number, radius: number): number[] {
  if (!Number.isFinite(radius)) {
    return Array.from({ length: grid.px.length }, (_, i) => i);
  }
  return queryRadius(grid, x, z, radius);
}

/** Compaction radius per lights mode (design Section 4): fog hides the rest. */
export const VISIBLE_RADIUS = { off: 38, on: 52 } as const;
