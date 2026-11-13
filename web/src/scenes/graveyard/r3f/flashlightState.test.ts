import { describe, expect, it } from 'vitest';
import {
  aimPoint,
  flashlightStateRef,
  FLASHLIGHT_ANGLE,
  FLASHLIGHT_FALLBACK_TARGET,
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

  it('keeps the documented fallback target', () => {
    expect(FLASHLIGHT_FALLBACK_TARGET).toEqual([0, 0.2, -2]);
  });

  it('publishes a unit direction', () => {
    writeFlashlightState([0, 0, 0], [0, 0, -4]);
    const s = flashlightStateRef.current;
    expect(s.direction).toEqual([0, 0, -1]);
    expect(s.halfAngle).toBe(FLASHLIGHT_ANGLE);
  });
});
