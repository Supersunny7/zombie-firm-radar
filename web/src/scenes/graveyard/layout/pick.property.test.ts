import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildGrid } from './grid';
import { computeLayout, type LayoutInput, type StoneLayout } from './layout';
import { pickStone, type Ray } from './pick';

type V3 = [number, number, number];

const MAX_T = 60;

/** Forward rotation R = Ry(yaw) * Rx(pitch) * Rz(roll) applied to a local vector. */
function rotate(s: StoneLayout, [x, y, z]: V3): V3 {
  const cr = Math.cos(s.roll);
  const sr = Math.sin(s.roll);
  const x1 = cr * x - sr * y;
  const y1 = sr * x + cr * y;
  const cp = Math.cos(s.pitch);
  const sp = Math.sin(s.pitch);
  const y2 = cp * y1 - sp * z;
  const z2 = sp * y1 + cp * z;
  const cy = Math.cos(s.yaw);
  const sy = Math.sin(s.yaw);
  return [cy * x1 + sy * z2, y2, -sy * x1 + cy * z2];
}

function toWorld(s: StoneLayout, p: V3): V3 {
  const r = rotate(s, p);
  return [s.x + r[0], s.baseY + r[1], s.z + r[2]];
}

/** Box corners; index bit0 = +x, bit1 = +y, bit2 = +z. */
function corners(s: StoneLayout, m = 0): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(
      toWorld(s, [
        i & 1 ? s.width / 2 + m : -s.width / 2 - m,
        i & 2 ? s.height + m : -m,
        i & 4 ? s.depth / 2 + m : -s.depth / 2 - m,
      ]),
    );
  }
  return out;
}

const QUADS: [number, number, number, number][] = [
  [0, 1, 3, 2],
  [4, 5, 7, 6],
  [0, 1, 5, 4],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 3, 7, 5],
];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Moller-Trumbore, double sided, with a small barycentric slack so shared edges are not missed. */
function triT(o: V3, d: V3, a: V3, b: V3, c: V3): number | null {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-14) return null;
  const tv = sub(o, a);
  const u = dot(tv, p) / det;
  const eps = 1e-9;
  if (u < -eps || u > 1 + eps) return null;
  const q = cross(tv, e1);
  const v = dot(d, q) / det;
  if (v < -eps || u + v > 1 + eps) return null;
  const t = dot(e2, q) / det;
  return t >= 0 && t <= MAX_T ? t : null;
}

/** Brute-force reference: ray against the 12 triangles of the transformed box. */
function refT(s: StoneLayout, ray: Ray, m = 0): number | null {
  const c = corners(s, m);
  const o: V3 = [ray.ox, ray.oy, ray.oz];
  const d: V3 = [ray.dx, ray.dy, ray.dz];
  let best: number | null = null;
  for (const [i, j, k, l] of QUADS) {
    for (const t of [
      triT(o, d, c[i] as V3, c[j] as V3, c[k] as V3),
      triT(o, d, c[i] as V3, c[k] as V3, c[l] as V3),
    ]) {
      if (t !== null && (best === null || t < best)) best = t;
    }
  }
  return best;
}

function refPick(
  stones: readonly StoneLayout[],
  ray: Ray,
  m = 0,
): { stone: number; t: number } | null {
  let best: { stone: number; t: number } | null = null;
  stones.forEach((s, i) => {
    const t = refT(s, ray, m);
    if (t !== null && (best === null || t < best.t)) best = { stone: i, t };
  });
  return best;
}

const statusArb = fc.constantFrom('zombie', 'endangered', 'healthy', 'insufficient_data');
const sectorArb = fc.constantFrom('Manufacturing', 'Mining', 'Retail Trade', 'Services');

const firmsArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 999_999_999 }), { minLength: 40, maxLength: 220 })
  .chain((ids) =>
    fc.tuple(
      fc.constant(ids),
      fc.array(fc.tuple(statusArb, sectorArb, fc.option(fc.integer({ min: 0, max: 1e10 }))), {
        minLength: ids.length,
        maxLength: ids.length,
      }),
    ),
  )
  .map(([ids, rest]) =>
    ids.map((id, i): LayoutInput => {
      const [status, sector, debt] = rest[i] as NonNullable<(typeof rest)[number]>;
      return { cik: String(id).padStart(10, '0'), status, sector, total_debt_usd: debt };
    }),
  );

const rayArb = fc.record({
  pickStoneU: fc.double({ min: 0, max: 1, noNaN: true }),
  preferFallen: fc.boolean(),
  local: fc.tuple(
    fc.double({ min: -0.7, max: 0.7, noNaN: true }),
    fc.double({ min: -0.1, max: 1.1, noNaN: true }),
    fc.double({ min: -0.7, max: 0.7, noNaN: true }),
  ),
  off: fc.tuple(
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
  ),
  offScale: fc.constantFrom(0, 0, 0.3, 1.5),
  from: fc.tuple(
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: 0.15, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
  ),
  dist: fc.double({ min: 3, max: 25, noNaN: true }),
  free: fc.boolean(),
  freeDir: fc.tuple(
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
    fc.double({ min: -1, max: 1, noNaN: true }),
  ),
});

describe('Property 16: picking equals the brute-force oriented box test', () => {
  // Feature: graveyard-horror-pass, Property 16: Picking equals the brute-force oriented box test
  // Validates: Requirements 8.12
  it('matches the triangle-based reference for random rays, including tilted and fallen stones', () => {
    let hits = 0;
    let fallenHits = 0;
    fc.assert(
      fc.property(firmsArb, fc.array(rayArb, { minLength: 8, maxLength: 12 }), (firms, rays) => {
        const layout = computeLayout(firms);
        const grid = buildGrid(layout);
        const stones = layout.stones;
        const fallen = stones.map((s, i) => (s.fallen ? i : -1)).filter((i) => i >= 0);
        for (const r of rays) {
          const pool = r.preferFallen && fallen.length > 0 ? fallen : stones.map((_, i) => i);
          const target = stones[
            pool[Math.min(pool.length - 1, Math.floor(r.pickStoneU * pool.length))] as number
          ] as StoneLayout;
          const aim = toWorld(target, [
            r.local[0] * target.width,
            r.local[1] * target.height,
            r.local[2] * target.depth,
          ]);
          aim[0] += r.off[0] * r.offScale;
          aim[1] += r.off[1] * r.offScale;
          aim[2] += r.off[2] * r.offScale;
          // Origin above every box (tallest top is 1.6 m), so it never starts inside a stone.
          const origin: V3 = [
            aim[0] + r.from[0] * r.dist,
            Math.max(2, aim[1] + r.from[1] * r.dist),
            aim[2] + r.from[2] * r.dist,
          ];
          let dir = sub(aim, origin);
          if (r.free) {
            const len = Math.hypot(...r.freeDir);
            if (len > 1e-3) dir = r.freeDir.map((v) => v * 10) as V3;
          }
          const len = Math.hypot(...dir);
          if (len < 1e-6) continue;
          const ray: Ray = {
            ox: origin[0],
            oy: origin[1],
            oz: origin[2],
            dx: dir[0] / len,
            dy: dir[1] / len,
            dz: dir[2] / len,
          };
          const got = pickStone(grid, layout, ray, MAX_T);
          // Skip rays that graze a box edge or face to within 1e-6 m: the answer there is
          // decided by floating point rounding, not by geometry.
          const inner = refPick(stones, ray, -1e-6);
          const outer = refPick(stones, ray, 1e-6);
          if ((inner === null) !== (outer === null) || inner?.stone !== outer?.stone) continue;
          const want = refPick(stones, ray);
          if (want === null) {
            expect(got).toBeNull();
          } else {
            hits++;
            if (stones[want.stone]?.fallen) fallenHits++;
            expect(got).not.toBeNull();
            expect(got?.t).toBeCloseTo(want.t, 6);
            if (got?.stone !== want.stone) {
              // Only acceptable for an exact distance tie between two boxes.
              const other = refT(stones[got?.stone as number] as StoneLayout, ray);
              expect(other).not.toBeNull();
              expect(other as number).toBeCloseTo(want.t, 6);
            }
          }
        }
      }),
      { numRuns: 150 },
    );
    // The generators must actually exercise hits, and fallen stones among them.
    expect(hits).toBeGreaterThan(100);
    expect(fallenHits).toBeGreaterThan(5);
  });
});
