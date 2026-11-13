import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeLayout } from '../layout/layout';
import { firmsArb } from '../layout/testArb';
import { pitCentreOf } from '../layout/extents';
import { moundPlacement, pitDistance } from './moundPlacement';

const EPS = 1e-9;

describe('mound placement', () => {
  // Feature: graveyard-horror-pass, Property 10: Mounds follow the jittered, standing headstone
  // Validates: Requirements 7.7, 7.8, 7.9
  it('Property 10: pitCentre is the standing base moved depth/2 + 0.45 m along standingYaw', () => {
    fc.assert(
      fc.property(firmsArb(40, 4), (firms) => {
        const layout = computeLayout(firms);
        for (const s of layout.stones) {
          const m = moundPlacement(s);
          // Mound yaw is the standing yaw, also for a fallen stone (7.8, 7.9).
          expect(m.yaw).toBe(s.standingYaw);
          // Layout pitCentre equals the placement pit and the standing base moved along the yaw.
          const d = pitDistance(s.depth);
          expect(Math.abs(s.pitCentre.x - (m.x + Math.sin(s.standingYaw) * d))).toBeLessThan(EPS);
          expect(Math.abs(s.pitCentre.z - (m.z + Math.cos(s.standingYaw) * d))).toBeLessThan(EPS);
          expect(Math.abs(m.pit.x - s.pitCentre.x)).toBeLessThan(EPS);
          expect(Math.abs(m.pit.z - s.pitCentre.z)).toBeLessThan(EPS);
          const again = pitCentreOf(m.x, m.z, s.standingYaw, s.depth);
          expect(again.x).toBeCloseTo(s.pitCentre.x, 9);
          // Front side faces the camera (+z): standing yaw is within 20 degrees (7.7).
          expect(Math.cos(s.standingYaw)).toBeGreaterThan(0.9);
          expect(s.pitCentre.z).toBeGreaterThan(m.z);
          if (!s.fallen) {
            // A standing stone: the mound centre is the stone base.
            expect(m.x).toBe(s.x);
            expect(m.z).toBe(s.z);
            expect(s.yaw).toBe(s.standingYaw);
          } else {
            // A fallen stone lies with its width along the front-back axis from the standing spot.
            const along = Math.hypot(m.x - s.x, m.z - s.z);
            expect(Math.abs(along - s.width / 2)).toBeLessThan(1e-9);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
