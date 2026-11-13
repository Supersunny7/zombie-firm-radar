import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const MAX_OFF_UP = (15 * Math.PI) / 180;
const EPS = 1e-9;

describe('fallen stones', () => {
  // Feature: graveyard-horror-pass, Property 12: Fallen stones lie face up
  // Validates: Requirement 8.7
  it('lie flat, engraved face up, yawed +-90 degrees from standing, sunk 0 to 0.08 m', () => {
    let fallenSeen = 0;
    fc.assert(
      fc.property(firmsArb(400, 6), (firms) => {
        const { stones } = computeLayout(firms);
        for (const s of stones) {
          if (!s.fallen) continue;
          fallenSeen++;
          // Engraved face normal (+z in model space) after Euler YXZ: y = -sin(pitch) * cos(roll)
          // for the pitch/roll used here; the angle from world up must be <= 15 degrees.
          const up = Math.cos(s.roll) * -Math.sin(s.pitch);
          const offUp = Math.acos(Math.min(1, Math.max(-1, up)));
          expect(offUp).toBeLessThanOrEqual(MAX_OFF_UP + EPS);
          expect(s.lean).toBe(0);
          // Yaw is the standing yaw rotated by exactly +-90 degrees.
          expect(Math.abs(s.yaw - s.standingYaw)).toBeCloseTo(Math.PI / 2, 9);
          // Sunk 0 to 0.08 m: instance y is depth / 2 - sink.
          expect(s.sink).toBeGreaterThanOrEqual(0);
          expect(s.sink).toBeLessThanOrEqual(0.08);
          expect(s.baseY).toBeCloseTo(s.depth / 2 - s.sink, 9);
        }
      }),
      OPTS,
    );
    // Guard against a vacuous pass: the generated lists must include fallen stones.
    expect(fallenSeen).toBeGreaterThan(0);
  });
});
