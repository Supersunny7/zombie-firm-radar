import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LOOK_CAMERA } from '../look';
import { CAMERA_BACK, CAMERA_HEIGHT, overviewPose, plotPose, projectToNdc } from './camera';
import { PIT_FRONT, extentOf } from './extents';
import { OFFSET_MAX } from './jitter';
import { DEPTH_RATIO, PAD, PLOT_GAP, WIDTH_MIN, computeLayout } from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const FOV = LOOK_CAMERA.fovDeg;
/** Viewport aspects of 23.3 and 9.3; pointer centred and sway 0, so the rig pose is plotPose. */
const ASPECTS = [1440 / 900, 390 / 844] as const;
/** Front row tolerance: stone standing positions are jittered by at most OFFSET_MAX along z. */
const ROW_TOL = OFFSET_MAX + 1e-6;

/** True when the ground point is inside the frustum of the pose (camera.test.ts maths). */
function inFrustum(pose: ReturnType<typeof overviewPose>, x: number, z: number, aspect: number) {
  const n = projectToNdc(pose, [x, 0, z], FOV, aspect);
  const eps = 1e-6;
  return n !== null && Math.abs(n.x) <= 1 + eps && Math.abs(n.y) <= 1 + eps;
}

describe('Property 46: the plot pose matches the prototype camera', () => {
  // Feature: graveyard-horror-pass, Property 46: The plot pose matches the prototype camera
  it('FOV 46, eye 1.2, look 0.6, near a headstone, inside rect + PLOT_GAP, mound bases in the lower half', () => {
    // Validates: Requirements 23.1, 23.2, 23.3, 9.2, 9.3, 9.4
    expect(FOV).toBe(46);
    fc.assert(
      fc.property(firmsArb(80, 8), fc.constantFrom(...ASPECTS), (firms, aspect) => {
        const layout = computeLayout(firms);
        for (const plot of layout.plots) {
          const pose = plotPose(plot);
          const [x, y, z] = pose.position;
          // 23.1: eye and look heights; pose centred on the plot.
          expect(Math.abs(y - 1.2)).toBeLessThanOrEqual(0.05);
          expect(Math.abs(pose.target[1] - 0.6)).toBeLessThanOrEqual(0.05);
          expect(x).toBe(plot.centerX);
          expect(pose.target[0]).toBe(plot.centerX);
          // 9.2: nearest headstone base within 4.0 m (horizontal).
          let nearest = Infinity;
          for (const i of plot.stones) {
            const s = layout.stones[i]!;
            nearest = Math.min(nearest, Math.hypot(s.x - x, s.z - z));
          }
          expect(nearest).toBeLessThanOrEqual(4.0);
          // 9.4: inside the plot rectangle extended by PLOT_GAP.
          expect(x).toBeGreaterThanOrEqual(plot.rect.x0 - PLOT_GAP);
          expect(x).toBeLessThanOrEqual(plot.rect.x1 + PLOT_GAP);
          expect(z).toBeGreaterThanOrEqual(plot.rect.z0 - PLOT_GAP);
          expect(z).toBeLessThanOrEqual(plot.rect.z1 + PLOT_GAP);
          // 23.3 / 9.3: nearest-row mound bases (Pit centres on the ground) below the vertical centre.
          const rowZ = plot.rowAnchors[0]!;
          let checked = 0;
          for (const idx of plot.stones) {
            const s = layout.stones[idx]!;
            // Standing position z recovered from the Pit centre (fallen stones lie behind it).
            const standZ = s.pitCentre.z - Math.cos(s.standingYaw) * (s.depth / 2 + PIT_FRONT);
            if (Math.abs(standZ - rowZ) > ROW_TOL) continue;
            checked++;
            const n = projectToNdc(pose, [s.pitCentre.x, 0, s.pitCentre.z], FOV, aspect);
            expect(n).not.toBeNull();
            expect(n!.y).toBeLessThan(0);
          }
          expect(checked).toBeGreaterThan(0);
        }
      }),
      OPTS,
    );
  });

  // Feature: graveyard-horror-pass, Property 46: The plot pose matches the prototype camera (overview unchanged)
  it('overview still contains every plot corner and ignores the plot eye height', () => {
    // Validates: Requirement 9.6
    fc.assert(
      fc.property(firmsArb(80, 8), fc.constantFrom(...ASPECTS), (firms, aspect) => {
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
      }),
      OPTS,
    );
  });

  it('keeps CAMERA_BACK inside the smallest possible front edge plus PLOT_GAP (9.4 worst case)', () => {
    // Smallest front-row extent: narrowest stone, yaw 0, pushed back by the full z jitter. Its
    // front is set by the mound zone: -0.30 + depth / 2 + PIT_FRONT + PIT_R_MAX = 0.7395 m. Larger
    // yaw, width, lean or a fallen body only push the front forward (layout.ts, extents.ts).
    const width = WIDTH_MIN;
    const depth = DEPTH_RATIO * width;
    const dz = -OFFSET_MAX;
    const body = {
      x: 0,
      z: dz,
      yaw: 0,
      pitch: 0,
      roll: 0,
      width,
      height: 0.85,
      depth,
      fallen: false,
    };
    const front = extentOf(body, 0, 0, dz).front;
    expect(front).toBeCloseTo(0.7395, 9);
    const limit = front + PAD + PLOT_GAP;
    expect(CAMERA_BACK).toBeLessThanOrEqual(limit);
    // Largest 0.05 m step that fits: the next step would leave the extended rectangle.
    expect(CAMERA_BACK + 0.05).toBeGreaterThan(limit);
  });
});
