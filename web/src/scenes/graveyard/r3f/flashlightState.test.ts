import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { LOOK_FLASHLIGHT } from '../look';
import {
  aimPoint,
  createFlickerState,
  flashlightStateRef,
  flickerStep,
  FLASHLIGHT_ANGLE,
  FLASHLIGHT_DISTANCE,
  FLASHLIGHT_FALLBACK_TARGET,
  FLASHLIGHT_OFFSET,
  writeFlashlightState,
} from './flashlightState';

describe('flashlightState', () => {
  it('aims at the ground plane when no stone is hit', () => {
    const p = aimPoint({ ox: 0, oy: 2, oz: 0, dx: 0, dy: -1, dz: 0 }, null);
    expect(p).toEqual([0, 0, 0]);
  });

  it('prefers a nearer stone hit over the ground', () => {
    const p = aimPoint({ ox: 0, oy: 2, oz: 0, dx: 0, dy: -0.5, dz: -0.5 }, 1);
    expect(p).toEqual([0, 1.5, -0.5]);
  });

  it('returns null for a ray above the horizon with no stone', () => {
    expect(aimPoint({ ox: 0, oy: 2, oz: 0, dx: 0, dy: 0.2, dz: -1 }, null)).toBeNull();
  });

  it('keeps the documented fallback target and camera-local offset', () => {
    expect(FLASHLIGHT_FALLBACK_TARGET).toEqual([0, 0.2, -2]);
    expect(FLASHLIGHT_OFFSET).toEqual([0.28, -0.32, 0.1]);
  });

  it('uses the Requirement 23.9 light values', () => {
    expect(LOOK_FLASHLIGHT.color).toBe('#ffe7c4');
    expect(LOOK_FLASHLIGHT.intensity).toBe(55);
    expect(LOOK_FLASHLIGHT.distance).toBe(26);
    expect(LOOK_FLASHLIGHT.angle).toBe(0.36);
    expect(LOOK_FLASHLIGHT.penumbra).toBe(0.95);
    expect(LOOK_FLASHLIGHT.decay).toBe(2);
    expect(LOOK_FLASHLIGHT.castShadow).toBe(true);
    expect(LOOK_FLASHLIGHT.shadowBias).toBe(-0.0004);
    expect(FLASHLIGHT_ANGLE).toBe(LOOK_FLASHLIGHT.angle);
    expect(FLASHLIGHT_DISTANCE).toBe(LOOK_FLASHLIGHT.distance);
  });

  it('publishes a unit direction', () => {
    writeFlashlightState([0, 0, 0], [0, 0, -4]);
    const s = flashlightStateRef.current;
    expect(s.direction).toEqual([0, 0, -1]);
    expect(s.halfAngle).toBe(0.36);
    expect(s.range).toBe(26);
    expect(s.active).toBe(true);
  });

  it('reports an inactive cone (range 0) in the overview', () => {
    writeFlashlightState([0, 0, 0], [0, 0, -4], false);
    const s = flashlightStateRef.current;
    expect(s.active).toBe(false);
    expect(s.range).toBe(0);
    writeFlashlightState([0, 0, 0], [0, 0, -4]);
    expect(flashlightStateRef.current.range).toBe(26);
  });
});

describe('flickerStep (23.9, Base_Spec cap 10.5 / 17.6)', () => {
  it('dims to x0.35 for one frame when the draw is below 0.006', () => {
    const st = createFlickerState();
    expect(flickerStep(st, 0, 0.0059)).toBe(0.35);
    expect(flickerStep(st, 1 / 60, 0.5)).toBe(1);
    expect(flickerStep(st, 2 / 60, 0.006)).toBe(1);
  });

  it('drops a fourth flicker inside 1 s and accepts again once the window has passed', () => {
    const st = createFlickerState();
    expect(flickerStep(st, 0, 0)).toBe(0.35);
    expect(flickerStep(st, 0.1, 0)).toBe(0.35);
    expect(flickerStep(st, 0.2, 0)).toBe(0.35);
    expect(flickerStep(st, 0.99, 0)).toBe(1);
    // Window (t - 1, t]: the start at 0 leaves it at t = 1.
    expect(flickerStep(st, 1, 0)).toBe(0.35);
    expect(flickerStep(st, 1.05, 0)).toBe(1);
  });

  it('never accepts more than 3 flickers in any 1 s window', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            dt: fc.double({ min: 0.001, max: 0.1, noNaN: true }),
            u: fc.double({ min: 0, max: 0.01, noNaN: true, maxExcluded: true }),
          }),
          { minLength: 1, maxLength: 400 },
        ),
        (frames) => {
          const st = createFlickerState();
          const accepted: number[] = [];
          let t = 0;
          for (const f of frames) {
            t += f.dt;
            const m = flickerStep(st, t, f.u);
            if (m !== 1 && m !== LOOK_FLASHLIGHT.flickerFactor) return false;
            if (m !== 1) accepted.push(t);
          }
          for (const a of accepted) {
            const n = accepted.filter((b) => b > a - 1 && b <= a).length;
            if (n > 3) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});
