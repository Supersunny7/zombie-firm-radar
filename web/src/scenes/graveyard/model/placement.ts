/**
 * Mutant position and corpse anchor (pure, no React or three imports).
 * Design section 8, requirements 9.1, 9.6, 9.7.
 */
import type { GraveyardLayout } from '../layout/layout';
import { FIRST_ROW_Z } from '../layout/layout';
import type { Vec3 } from './coneCovers';

/** Initial camera position used for the corpse choice (9.6). */
export const INITIAL_CAMERA: Vec3 = { x: 0, y: 1.5, z: 5.6 };
/** Distance behind the back edge of the last row (>= 20 required, 9.1). */
export const MUTANT_BEHIND = 24;
export const MUTANT_MIN_BEHIND = 20;

export interface MutantPlacement {
  readonly x: number;
  readonly z: number;
  /** z of the back edge of the last plot row. */
  readonly lastRowBackZ: number;
}

/**
 * The last row is the set of plots farthest from the camera (smallest front edge z1).
 * The Mutant stands at the centre x of that row, MUTANT_BEHIND units behind its back edge.
 */
export function mutantPlacement(layout: GraveyardLayout): MutantPlacement {
  if (layout.plots.length === 0) {
    const back = FIRST_ROW_Z;
    return { x: 0, z: back - MUTANT_BEHIND, lastRowBackZ: back };
  }
  let lastTop = Infinity;
  for (const p of layout.plots) lastTop = Math.min(lastTop, p.rect.z1);
  let x0 = Infinity;
  let x1 = -Infinity;
  let back = Infinity;
  for (const p of layout.plots) {
    if (p.rect.z1 !== lastTop) continue;
    x0 = Math.min(x0, p.rect.x0);
    x1 = Math.max(x1, p.rect.x1);
    back = Math.min(back, p.rect.z0);
  }
  return { x: (x0 + x1) / 2, z: back - MUTANT_BEHIND, lastRowBackZ: back };
}

/**
 * Index (into `layout.stones`, equal to the firm index) of the zombie stone whose base
 * centre (x, 0, z) is nearest to `camera` by straight-line distance; ties go to the
 * lower index. Returns null when no stone is a zombie.
 */
export function corpseAnchor(
  layout: GraveyardLayout,
  isZombie: (firmIndex: number) => boolean,
  camera: Vec3 = INITIAL_CAMERA,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (let i = 0; i < layout.stones.length; i++) {
    if (!isZombie(i)) continue;
    const s = layout.stones[i];
    if (!s) continue;
    const d = Math.hypot(s.x - camera.x, 0 - camera.y, s.z - camera.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
