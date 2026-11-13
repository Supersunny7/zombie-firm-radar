import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CAMERA_HEIGHT, overviewPose, plotPose } from './camera';
import { PLOT_GAP, computeLayout } from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const FOV = 52;

/** True when the ground point is inside the frustum of the pose (same maths as camera.test.ts). */
function inFrustum(pose: ReturnType<typeof overviewPose>, x: number, z: number, aspect: number) {
  const [px, py, pz] = pose.position;
  let fx = pose.target[0] - px;
  let fy = pose.target[1] - py;
  let fz = pose.target[2] - pz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const vx = x - px;
  const vy = -py;
  const vz = z - pz;
  const depth = vx * fx + vy * fy + vz * fz;
  const tv = Math.tan((FOV * Math.PI) / 360);
  const eps = 1e-6;
  return (
    depth > 0 &&
    Math.abs(vx * rx + vz * rz) <= depth * tv * aspect + eps &&
    Math.abs(vx * ux + vy * uy + vz * uz) <= depth * tv + eps
  );
}

describe('plot camera pose', () => {
  // Feature: graveyard-horror-pass, Property 17: Plot camera pose sits among the graves
  it('Property 17: eye 1.5 +- 0.1, within 4.0 m of the nearest headstone, inside rect + PLOT_GAP', () => {
    fc.assert(
      fc.property(firmsArb(80, 8), (firms) => {
        const layout = computeLayout(firms);
        for (const plot of layout.plots) {
          const pose = plotPose(plot);
          const [x, y, z] = pose.position;
          expect(Math.abs(y - CAMERA_HEIGHT)).toBeLessThanOrEqual(0.1);
          let nearest = Infinity;
          for (const i of plot.stones) {
            const s = layout.stones[i]!;
            nearest = Math.min(nearest, Math.hypot(s.x - x, s.z - z));
          }
          expect(nearest).toBeLessThanOrEqual(4.0);
          expect(x).toBeGreaterThanOrEqual(plot.rect.x0 - PLOT_GAP);
          expect(x).toBeLessThanOrEqual(plot.rect.x1 + PLOT_GAP);
          expect(z).toBeGreaterThanOrEqual(plot.rect.z0 - PLOT_GAP);
          expect(z).toBeLessThanOrEqual(plot.rect.z1 + PLOT_GAP);
        }
      }),
      OPTS,
    );
  });

  // Feature: graveyard-horror-pass, Property 17: Plot camera pose sits among the graves (overview containment, unchanged)
  it('Property 17: overview still contains every plot corner for aspect 0.5 to 3 (no 1.5 m rule)', () => {
    fc.assert(
      fc.property(
        firmsArb(80, 8),
        fc.double({ min: 0.5, max: 3, noNaN: true }),
        (firms, aspect) => {
          const layout = computeLayout(firms);
          const pose = overviewPose(layout.bounds, FOV, aspect);
          for (const plot of layout.plots) {
            const r = plot.rect;
            for (const x of [r.x0, r.x1]) {
              for (const z of [r.z0, r.z1]) {
                expect(inFrustum(pose, x, z, aspect)).toBe(true);
              }
            }
          }
          expect(pose.position[1]).toBeGreaterThan(CAMERA_HEIGHT + 0.1);
        },
      ),
      OPTS,
    );
  });
});
