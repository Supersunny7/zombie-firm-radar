import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LEAN_ZOMBIE } from './layout';
import { FALLEN_SINK_MAX, OFFSET_MAX, YAW_MAX, stoneJitter } from './jitter';

describe('stoneJitter', () => {
  it('is deterministic and within the documented ranges', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (cik) => {
        const j = stoneJitter(cik);
        expect(stoneJitter(cik)).toEqual(j);
        expect(Math.abs(j.dx)).toBeLessThanOrEqual(OFFSET_MAX);
        expect(Math.abs(j.dz)).toBeLessThanOrEqual(OFFSET_MAX);
        expect(Math.abs(j.yaw)).toBeLessThanOrEqual(YAW_MAX);
        expect(j.heightFactor).toBeGreaterThanOrEqual(0.9);
        expect(j.heightFactor).toBeLessThanOrEqual(1.1);
        expect(j.fallenSink).toBeGreaterThanOrEqual(0);
        expect(j.fallenSink).toBeLessThanOrEqual(FALLEN_SINK_MAX);
        expect(Math.abs(j.fallenSideYaw)).toBeCloseTo(Math.PI / 2, 12);
      }),
    );
  });

  it('marks about 5 percent of firms as fallen', () => {
    let n = 0;
    for (let i = 0; i < 4000; i++) if (stoneJitter(String(i).padStart(10, '0')).fallen) n++;
    expect(n / 4000).toBeGreaterThan(0.03);
    expect(n / 4000).toBeLessThan(0.07);
  });

  it('keeps the zombie lean at most 8 degrees', () => {
    expect(LEAN_ZOMBIE[1]).toBeLessThanOrEqual((8 * Math.PI) / 180);
  });
});
