import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { LOOK_CAMERA } from '../look';
import {
  CAMERA_BACK,
  CAMERA_HEIGHT,
  TARGET_AHEAD,
  TARGET_Y,
  nextPlot,
  overviewLabel,
  overviewPose,
  plotLabel,
  plotPose,
  projectToNdc,
  smooth,
  swayAmplitude,
} from './camera';
import type { Rect } from './layout';

const FOV = 46;

/** True when the ground point (x, 0, z) is inside the frustum of the pose (with a small slack). */
function inFrustum(
  pose: ReturnType<typeof overviewPose>,
  x: number,
  z: number,
  aspect: number,
): boolean {
  const [px, py, pz] = pose.position;
  const [tx, ty, tz] = pose.target;
  let fx = tx - px;
  let fy = ty - py;
  let fz = tz - pz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = f x worldUp (0,1,0); up = right x f
  let rx = -fz;
  const ry = 0;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  const vx = x - px;
  const vy = -py;
  const vz = z - pz;
  const depth = vx * fx + vy * fy + vz * fz;
  const tv = Math.tan((FOV * Math.PI) / 360);
  const eps = 1e-6;
  return (
    depth > 0 &&
    Math.abs(vx * rx + vy * ry + vz * rz) <= depth * tv * aspect + eps &&
    Math.abs(vx * ux + vy * uy + vz * uz) <= depth * tv + eps
  );
}

describe('plotPose (23.1)', () => {
  it('plot 1 gives the prototype pose (0, 1.2, 5.7) looking at (0, 0.6, 2.0)', () => {
    const p = plotPose({ centerX: 0, frontZ: 3 });
    expect(p.position[0]).toBeCloseTo(0);
    expect(p.position[1]).toBeCloseTo(1.2);
    expect(p.position[2]).toBeCloseTo(5.7);
    expect(p.target[0]).toBeCloseTo(0);
    expect(p.target[1]).toBeCloseTo(0.6);
    expect(p.target[2]).toBeCloseTo(2.0);
  });

  it('takes eye 1.2, look 0.6, back 2.7 and ahead 1.0 from look.ts', () => {
    expect(CAMERA_HEIGHT).toBe(LOOK_CAMERA.eyeHeight);
    expect(TARGET_Y).toBe(LOOK_CAMERA.lookHeight);
    expect(CAMERA_BACK).toBe(LOOK_CAMERA.back);
    expect(TARGET_AHEAD).toBe(LOOK_CAMERA.targetAhead);
    expect([CAMERA_HEIGHT, TARGET_Y, CAMERA_BACK, TARGET_AHEAD]).toEqual([1.2, 0.6, 2.7, 1.0]);
  });

  it('follows the plot centre and front row', () => {
    const p = plotPose({ centerX: -7.5, frontZ: -20 });
    expect(p.position[0]).toBe(-7.5);
    expect(p.position[1]).toBe(1.2);
    expect(p.position[2]).toBeCloseTo(-17.3, 12);
    expect(p.target).toEqual([-7.5, 0.6, -21]);
  });
});

describe('smooth', () => {
  it('leaves under 5% after 1 s, whatever the frame rate', () => {
    for (const dt of [1 / 144, 1 / 60, 1 / 30, 0.25]) {
      let v = 0;
      const steps = Math.round(1 / dt);
      for (let i = 0; i < steps; i++) v = smooth(v, 1, dt);
      expect(1 - v).toBeLessThan(0.05);
      expect(1 - v).toBeCloseTo(Math.exp(-4), 6);
    }
  });
  it('ignores non-positive dt', () => {
    expect(smooth(2, 5, 0)).toBe(2);
  });
});

describe('swayAmplitude', () => {
  it('follows lights mode and reduced motion', () => {
    expect(swayAmplitude('off', false)).toBe(0.035);
    expect(swayAmplitude('on', false)).toBe(0.02);
    expect(swayAmplitude('off', true)).toBe(0);
    expect(swayAmplitude('on', true)).toBe(0);
  });
});

describe('overviewPose (Property 26)', () => {
  it('contains every corner of the bounds for aspect 0.5 to 3', () => {
    const rectArb = fc
      .record({
        x0: fc.double({ min: -300, max: 0, noNaN: true }),
        z0: fc.double({ min: -300, max: 0, noNaN: true }),
        w: fc.double({ min: 1, max: 400, noNaN: true }),
        d: fc.double({ min: 1, max: 400, noNaN: true }),
      })
      .map((r): Rect => ({ x0: r.x0, z0: r.z0, x1: r.x0 + r.w, z1: r.z0 + r.d }));
    fc.assert(
      fc.property(rectArb, fc.double({ min: 0.5, max: 3, noNaN: true }), (b, aspect) => {
        const pose = overviewPose(b, FOV, aspect);
        for (const x of [b.x0, b.x1]) {
          for (const z of [b.z0, b.z1]) {
            if (!inFrustum(pose, x, z, aspect)) return false;
          }
        }
        return true;
      }),
    );
  });
});

describe('nextPlot (Property 27)', () => {
  it('clamps and never wraps', () => {
    expect(nextPlot(0, 'left', 5)).toBe(0);
    expect(nextPlot(4, 'right', 5)).toBe(4);
    expect(nextPlot(2, 'left', 5)).toBe(1);
    expect(nextPlot(2, 'right', 5)).toBe(3);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        fc.nat(39),
        fc.constantFrom('left' as const, 'right' as const),
        (count, cur0, dir) => {
          const cur = Math.min(cur0, count - 1);
          const n = nextPlot(cur, dir, count);
          return n >= 0 && n <= count - 1 && Math.abs(n - cur) <= 1;
        },
      ),
    );
  });
});

describe('labels (Property 28)', () => {
  it('formats plot and overview labels', () => {
    const plots = [
      { sector: 'Manufacturing', count: 12 },
      { sector: 'Retail Trade', count: 1 },
    ];
    expect(plotLabel(plots, 1)).toBe('PLOT 2 \u2014 RETAIL TRADE \u00b7 1 GRAVES');
    expect(plotLabel(plots, 0)).toBe('PLOT 1 \u2014 MANUFACTURING \u00b7 12 GRAVES');
    expect(overviewLabel(7)).toBe('OVERVIEW \u00b7 7 PLOTS');
  });
});

describe('projectToNdc', () => {
  const pose = plotPose({ centerX: 0, frontZ: 3 });

  it('puts the look target at the centre', () => {
    const n = projectToNdc(pose, pose.target, FOV, 1440 / 900);
    expect(n?.x).toBeCloseTo(0, 9);
    expect(n?.y).toBeCloseTo(0, 9);
  });

  it('puts a front-row mound base (2.1 m ahead) below the centre at both aspects', () => {
    // Depression atan(1.2 / 2.1) = 29.7 deg, view pitch atan(0.6 / 3.7) = 9.2 deg: 20.5 deg below the
    // centre, inside the 23 deg half FOV (design section 6, CAMERA_BACK 2.7).
    for (const aspect of [1440 / 900, 390 / 844]) {
      const n = projectToNdc(pose, [0, 0, 3.6], FOV, aspect);
      expect(n).not.toBeNull();
      expect(n!.y).toBeLessThan(0);
      expect(n!.y).toBeGreaterThan(-1);
    }
  });

  it('returns null behind the camera and puts right-hand points at positive x', () => {
    expect(projectToNdc(pose, [0, 0, 9], FOV, 1)).toBeNull();
    expect(projectToNdc(pose, [1, 0, 0], FOV, 1)!.x).toBeGreaterThan(0);
  });
});
