/**
 * Ray picking against the stone layout (pure, plain numbers, no three imports).
 *
 * Stone box: width x height x depth with its base centre at (x, baseY, z), rotated by the
 * full Euler rotation (yaw, pitch, roll; order YXZ, as rendered). Fallen stones are
 * pitch = -PI/2. The slab test is exact for this oriented box.
 * The ray direction need not be normalised; `t` and `maxT` are in ray-parameter units.
 */
import { forEachCentreInRect, type Grid } from './grid';
import { stoneBaseY, stoneCentreY, type GraveyardLayout, type StoneLayout } from './layout';

export interface Ray {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface PickHit {
  stone: number;
  t: number;
}

export interface NearHit {
  stone: number;
  perp: number;
}

/** Entry parameter of the ray into the stone's box within [0, maxT], or null. */
export function rayStoneT(s: StoneLayout, ray: Ray, maxT: number): number | null {
  const cy = Math.cos(s.yaw);
  const sy = Math.sin(s.yaw);
  const cp = Math.cos(s.pitch);
  const sp = Math.sin(s.pitch);
  const cr = Math.cos(s.roll);
  const sr = Math.sin(s.roll);
  // World -> local: inverse of R = Ry(yaw) Rx(pitch) Rz(roll) (three 'YXZ'), i.e.
  // Rz(-roll) Rx(-pitch) Ry(-yaw), applied to a vector (no translation).
  const toLocal = (vx: number, vy: number, vz: number): [number, number, number] => {
    const x1 = cy * vx - sy * vz;
    const z1 = sy * vx + cy * vz;
    const y2 = cp * vy + sp * z1;
    const z2 = -sp * vy + cp * z1;
    return [cr * x1 + sr * y2, -sr * x1 + cr * y2, z2];
  };
  // The model origin sits at (x, baseY, z); the body spans width x height x depth with
  // its base centre at the origin (fallen stones are just pitch = -PI/2).
  const o = toLocal(ray.ox - s.x, ray.oy - stoneBaseY(s), ray.oz - s.z);
  const d = toLocal(ray.dx, ray.dy, ray.dz);
  const lo = [-s.width / 2, 0, -s.depth / 2];
  const hi = [s.width / 2, s.height, s.depth / 2];
  let tMin = 0;
  let tMax = maxT;
  for (let a = 0; a < 3; a++) {
    const oa = o[a] as number;
    const da = d[a] as number;
    const la = lo[a] as number;
    const ha = hi[a] as number;
    if (da === 0) {
      if (oa < la || oa > ha) return null;
      continue;
    }
    let t1 = (la - oa) / da;
    let t2 = (ha - oa) / da;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tMin) tMin = t1;
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }
  return tMin;
}

/** Nearest stone box hit by the ray within maxT (ties: lower stone index), or null. */
export function pickStone(
  grid: Grid,
  layout: GraveyardLayout,
  ray: Ray,
  maxT = 60,
): PickHit | null {
  const { cell, x0, z0, nx, nz } = grid;
  const { ox, oz, dx, dz } = ray;
  if (dx === 0 && dz === 0 && ray.dy === 0) return null;
  if (!(maxT > 0)) return null;

  // Clip the ground projection to the grid rectangle.
  let tEnter = 0;
  let tLeave = maxT;
  const bounds: [number, number, number, number][] = [
    [ox, dx, x0, x0 + nx * cell],
    [oz, dz, z0, z0 + nz * cell],
  ];
  for (const [o, d, lo, hi] of bounds) {
    if (d === 0) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tEnter) tEnter = t1;
    if (t2 < tLeave) tLeave = t2;
  }
  if (tEnter > tLeave) return null;

  const clamp = (v: number, hi: number) => (v < 0 ? 0 : v > hi ? hi : v);
  let ix = clamp(Math.floor((ox + dx * tEnter - x0) / cell), nx - 1);
  let iz = clamp(Math.floor((oz + dz * tEnter - z0) / cell), nz - 1);
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
  let tMaxX = stepX === 0 ? Infinity : ((ix + (stepX > 0 ? 1 : 0)) * cell + x0 - ox) / dx;
  let tMaxZ = stepZ === 0 ? Infinity : ((iz + (stepZ > 0 ? 1 : 0)) * cell + z0 - oz) / dz;
  const tDeltaX = stepX === 0 ? Infinity : cell / Math.abs(dx);
  const tDeltaZ = stepZ === 0 ? Infinity : cell / Math.abs(dz);

  let best: PickHit | null = null;
  for (;;) {
    const c = ix + iz * nx;
    const end = grid.cellStart[c + 1] ?? 0;
    for (let k = grid.cellStart[c] ?? 0; k < end; k++) {
      const i = grid.cellItems[k] ?? 0;
      const s = layout.stones[i];
      if (!s) continue;
      const t = rayStoneT(s, ray, maxT);
      if (t === null) continue;
      if (best === null || t < best.t || (t === best.t && i < best.stone)) {
        best = { stone: i, t };
      }
    }
    const tExit = Math.min(tMaxX, tMaxZ);
    // Any stone hit before tExit lives in a cell already visited.
    if (best !== null && best.t < tExit) return best;
    if (tExit > tLeave) break;
    if (tMaxX < tMaxZ) {
      ix += stepX;
      tMaxX += tDeltaX;
    } else {
      iz += stepZ;
      tMaxZ += tDeltaZ;
    }
    if (ix < 0 || ix >= nx || iz < 0 || iz >= nz) break;
  }
  return best;
}

/**
 * Perpendicular 3D distance from a stone's box centre to the ray, for stones whose
 * closest point lies on the ray segment t in [0, maxT]; null otherwise.
 */
export function perpToRay(s: StoneLayout, ray: Ray, maxT: number): number | null {
  const dd = ray.dx * ray.dx + ray.dy * ray.dy + ray.dz * ray.dz;
  if (dd === 0) return null;
  const vx = s.x - ray.ox;
  const vy = stoneCentreY(s) - ray.oy;
  const vz = s.z - ray.oz;
  const t = (vx * ray.dx + vy * ray.dy + vz * ray.dz) / dd;
  if (t < 0 || t > maxT) return null;
  return Math.hypot(vx - t * ray.dx, vy - t * ray.dy, vz - t * ray.dz);
}

function byPerp(a: NearHit, b: NearHit): number {
  return a.perp - b.perp || a.stone - b.stone;
}

/**
 * The `n` stones with the smallest perpendicular distance to the ray (ties: lower index).
 * A band around the ray starts at 2 m and doubles up to 64 m until it holds at least n
 * stones within the band distance, which makes the result exact; if 64 m is not enough
 * every stone is examined.
 */
export function nearestToRay(
  grid: Grid,
  layout: GraveyardLayout,
  ray: Ray,
  n: number,
  maxT = 60,
): NearHit[] {
  if (!(n >= 1) || !(maxT > 0)) return [];
  const stones = layout.stones;
  const ex = ray.ox + ray.dx * maxT;
  const ez = ray.oz + ray.dz * maxT;
  const xLo = Math.min(ray.ox, ex);
  const xHi = Math.max(ray.ox, ex);
  const zLo = Math.min(ray.oz, ez);
  const zHi = Math.max(ray.oz, ez);

  for (let w = 2; w <= 64; w *= 2) {
    const within: NearHit[] = [];
    forEachCentreInRect(grid, xLo - w, xHi + w, zLo - w, zHi + w, (i) => {
      const s = stones[i];
      if (!s) return;
      const perp = perpToRay(s, ray, maxT);
      if (perp !== null && perp <= w) within.push({ stone: i, perp });
    });
    if (within.length >= n) return within.sort(byPerp).slice(0, n);
  }

  const all: NearHit[] = [];
  stones.forEach((s, i) => {
    const perp = perpToRay(s, ray, maxT);
    if (perp !== null) all.push({ stone: i, perp });
  });
  return all.sort(byPerp).slice(0, n);
}
