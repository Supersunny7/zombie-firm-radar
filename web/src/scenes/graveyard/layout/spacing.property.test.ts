import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { footprintCorners, type Point2 } from './extents';
import { MIN_GAP, computeLayout } from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const EPS = 1e-9;
/** Paths between plots (requirement 8.10). */
const MIN_PATH = 1.2;
/** Pit centre sits this far in front of the standing stone face (extents.ts PIT_FRONT). */
const PIT_FRONT = 0.45;

type Quad = readonly Point2[];

/** Largest separation over the edge normals of both rectangles plus the world axes: a lower bound of the true distance. */
function separation(a: Quad, b: Quad): number {
  const axes: Point2[] = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
  ];
  for (const q of [a, b]) {
    for (let i = 0; i < 2; i++) {
      const p = q[i]!;
      const n = q[i + 1]!;
      const len = Math.hypot(n.x - p.x, n.z - p.z) || 1;
      axes.push({ x: -(n.z - p.z) / len, z: (n.x - p.x) / len });
    }
  }
  let best = -Infinity;
  for (const ax of axes) {
    const pa = a.map((p) => p.x * ax.x + p.z * ax.z);
    const pb = b.map((p) => p.x * ax.x + p.z * ax.z);
    best = Math.max(best, Math.min(...pa) - Math.max(...pb), Math.min(...pb) - Math.max(...pa));
  }
  return best;
}

function distToSegment(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Distance from a point to a convex quad; 0 when inside. */
function distToQuad(p: Point2, q: Quad): number {
  let inside = true;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i]!;
    const b = q[(i + 1) % 4]!;
    const cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    if (Math.abs(cross) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) inside = false;
  }
  if (inside) return 0;
  let d = Infinity;
  for (let i = 0; i < 4; i++) d = Math.min(d, distToSegment(p, q[i]!, q[(i + 1) % 4]!));
  return d;
}

// Feature: graveyard-horror-pass, Property 14: Stones keep their distance and never cover their own Pit
describe('Property 14: stone spacing and Pit clearance', () => {
  it('keeps oriented footprints of one plot at least MIN_GAP (0.15 m) apart', () => {
    // Validates: Requirement 8.9
    fc.assert(
      fc.property(firmsArb(40), (firms) => {
        const layout = computeLayout(firms);
        const quads = layout.stones.map((s) => footprintCorners(s));
        for (let i = 0; i < quads.length; i++) {
          for (let j = i + 1; j < quads.length; j++) {
            if (layout.stones[i]!.plot !== layout.stones[j]!.plot) continue;
            expect(separation(quads[i]!, quads[j]!)).toBeGreaterThanOrEqual(MIN_GAP - EPS);
          }
        }
      }),
      OPTS,
    );
  });

  it('keeps at least 1.2 m between plots', () => {
    // Validates: Requirement 8.10
    fc.assert(
      fc.property(firmsArb(60, 8), (firms) => {
        const { plots } = computeLayout(firms);
        for (let i = 0; i < plots.length; i++) {
          for (let j = i + 1; j < plots.length; j++) {
            const a = plots[i]!.rect;
            const b = plots[j]!.rect;
            const gapX = Math.max(a.x0 - b.x1, b.x0 - a.x1);
            const gapZ = Math.max(a.z0 - b.z1, b.z0 - a.z1);
            expect(Math.max(gapX, gapZ)).toBeGreaterThanOrEqual(MIN_PATH - EPS);
          }
        }
      }),
      OPTS,
    );
  });

  it('tilts every zombie/endangered stone more than any healthy/insufficient_data stone', () => {
    // Validates: Requirement 8.10 (tilt ordering)
    fc.assert(
      fc.property(firmsArb(), (firms) => {
        const layout = computeLayout(firms);
        let undeadMin = Infinity;
        let calmMax = -Infinity;
        firms.forEach((f, i) => {
          const s = layout.stones[i]!;
          if (s.fallen) return;
          if (f.status === 'zombie' || f.status === 'endangered')
            undeadMin = Math.min(undeadMin, s.lean);
          else calmMax = Math.max(calmMax, s.lean);
        });
        if (undeadMin !== Infinity && calmMax !== -Infinity) {
          expect(undeadMin).toBeGreaterThan(calmMax);
        }
      }),
      OPTS,
    );
  });

  it('never lets a fallen stone cover its own Pit', () => {
    // Validates: Requirement 8.11
    fc.assert(
      fc.property(firmsArb(), (firms) => {
        const layout = computeLayout(firms);
        for (const s of layout.stones) {
          if (!s.fallen) continue;
          const quad = footprintCorners(s);
          // The Pit centre is outside the body footprint and at least PIT_FRONT from it:
          // the front edge ends at the standing position, the Pit starts in front of it.
          expect(distToQuad(s.pitCentre, quad)).toBeGreaterThanOrEqual(PIT_FRONT - 1e-6);
        }
      }),
      OPTS,
    );
  });
});
