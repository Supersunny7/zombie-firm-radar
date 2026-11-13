/**
 * Grass card placement (pure, no React or three; design section 5, requirements 6.4 to 6.9).
 *
 * Cards depend only on the plot's own sector name and its own stones, so adding or removing
 * other plots never moves them.
 */
import { fnv1a32 } from '../../../engine/hash';
import { mulberry32 } from '../../../engine/rng';
import { PIT_R_MAX, footprintCorners } from '../layout/extents';
import type { GraveyardLayout, PlotLayout, StoneLayout } from '../layout/layout';

export const GRASS_CAP = 1500;
export const GRASS_NEAR_BUDGET = 1200;
export const GRASS_BG_MAX = 300;
/** Background density per square metre; far below the lowest near-mound density (about 0.4). */
export const GRASS_BG_DENSITY = 0.04;
export const GRASS_NEAR_RADIUS = 1.0;
export const GRASS_MAX_HEIGHT = 0.35;
const MIN_HEIGHT = 0.15;
const CARD_WIDTH = 0.5;
/** Safety margin around footprints, metres. */
const FOOT_MARGIN = 0.05;
const TRIES = 8;

export interface GrassCard {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  /** Metres, at most GRASS_MAX_HEIGHT. */
  readonly height: number;
  /** Metres; the card geometry is 0.5 wide, scaled so width / height stays constant. */
  readonly width: number;
}

interface Obstacle {
  readonly cx: number;
  readonly cz: number;
  readonly reach: number;
  readonly corners: readonly { x: number; z: number }[];
}

function obstacleOf(s: StoneLayout): Obstacle {
  const corners = footprintCorners(s);
  let reach = 0;
  for (const p of corners) reach = Math.max(reach, Math.hypot(p.x - s.x, p.z - s.z));
  return { cx: s.x, cz: s.z, reach: reach + FOOT_MARGIN, corners };
}

/** True when (x, z) lies inside the convex quad, grown by FOOT_MARGIN. */
function inQuad(x: number, z: number, q: readonly { x: number; z: number }[]): boolean {
  let area2 = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i] as { x: number; z: number };
    const b = q[(i + 1) % 4] as { x: number; z: number };
    area2 += a.x * b.z - b.x * a.z;
  }
  const orient = area2 >= 0 ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    const a = q[i] as { x: number; z: number };
    const b = q[(i + 1) % 4] as { x: number; z: number };
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const len = Math.hypot(ex, ez) || 1;
    // Positive on the inner side for either winding.
    const inner = (orient * (ex * (z - a.z) - ez * (x - a.x))) / len;
    if (inner < -FOOT_MARGIN) return false;
  }
  return true;
}

function blocked(
  x: number,
  z: number,
  obstacles: readonly Obstacle[],
  stones: readonly StoneLayout[],
): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i] as Obstacle;
    const s = stones[i] as StoneLayout;
    if (Math.hypot(x - o.cx, z - o.cz) <= o.reach && inQuad(x, z, o.corners)) return true;
    if (Math.hypot(x - s.pitCentre.x, z - s.pitCentre.z) <= PIT_R_MAX) return true;
  }
  return false;
}

/**
 * Grass cards of one plot. `quality` 'low' keeps every second card (at most half).
 * Returns [] for an unknown plot index.
 */
export function placeGrass(
  layout: GraveyardLayout,
  plotIndex: number,
  quality: 'normal' | 'low' = 'normal',
): GrassCard[] {
  const plot: PlotLayout | undefined = layout.plots[plotIndex];
  if (!plot || plot.stones.length === 0) return [];

  const stones = plot.stones.map((i) => layout.stones[i] as StoneLayout);
  const obstacles = stones.map(obstacleOf);
  const n = stones.length;
  const rand = mulberry32(fnv1a32(plot.sector));

  const perMound = Math.max(1, Math.min(5, Math.floor(GRASS_NEAR_BUDGET / n)));
  const stride = n > GRASS_NEAR_BUDGET ? Math.ceil(n / GRASS_NEAR_BUDGET) : 1;

  const cards: GrassCard[] = [];
  const make = (x: number, z: number, uYaw: number, uH: number): GrassCard => {
    const height = MIN_HEIGHT + (GRASS_MAX_HEIGHT - MIN_HEIGHT) * uH;
    return {
      x,
      z,
      yaw: uYaw * Math.PI,
      height,
      width: CARD_WIDTH * (height / GRASS_MAX_HEIGHT),
    };
  };

  // Near-mound cards: area-uniform in the ring between the Pit and 1.0 m of the pit centre.
  const r0 = PIT_R_MAX + 0.05;
  for (let k = 0; k < n; k += stride) {
    const s = stones[k] as StoneLayout;
    for (let c = 0; c < perMound; c++) {
      for (let t = 0; t < TRIES; t++) {
        const uR = rand();
        const uA = rand();
        const uYaw = rand();
        const uH = rand();
        const r = Math.sqrt(r0 * r0 + uR * (GRASS_NEAR_RADIUS * GRASS_NEAR_RADIUS - r0 * r0));
        const a = uA * 2 * Math.PI;
        const x = s.pitCentre.x + Math.cos(a) * r;
        const z = s.pitCentre.z + Math.sin(a) * r;
        if (blocked(x, z, obstacles, stones)) continue;
        cards.push(make(x, z, uYaw, uH));
        break;
      }
    }
  }

  // Sparse background over the plot rectangle.
  const { x0, z0, x1, z1 } = plot.rect;
  const area = (x1 - x0) * (z1 - z0);
  const bg = Math.min(GRASS_BG_MAX, Math.ceil(area * GRASS_BG_DENSITY));
  for (let c = 0; c < bg; c++) {
    for (let t = 0; t < TRIES; t++) {
      const x = x0 + rand() * (x1 - x0);
      const z = z0 + rand() * (z1 - z0);
      const uYaw = rand();
      const uH = rand();
      if (blocked(x, z, obstacles, stones)) continue;
      cards.push(make(x, z, uYaw, uH));
      break;
    }
  }

  const capped = cards.length > GRASS_CAP ? cards.slice(0, GRASS_CAP) : cards;
  return quality === 'low' ? capped.filter((_, i) => i % 2 === 1) : capped;
}
