import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  CLOD_GAP,
  CLOD_MAX,
  CLOD_MIN,
  CLOD_R_MAX,
  CLOD_SCALE_MAX,
  CLOD_SCALE_MIN,
  RIM_AT,
  RIM_HEIGHT,
  clodCount,
  clodsFor,
  pitRadius,
  tornMoundProfile,
} from './tornMound';

const cikArb = fc.oneof(
  fc.integer({ min: 0, max: 9_999_999_999 }).map((n) => String(n).padStart(10, '0')),
  fc.string({ minLength: 1, maxLength: 12 }),
);

describe('tornMound geometry', () => {
  // Feature: graveyard-horror-pass, Property 9: Pit and clod geometry
  it('Pit is 0.5 to 0.9 m wide, 6 to 14 clods lie outside the Pit within 1.2 m, rim is raised', () => {
    // **Validates: Requirements 7.2**
    fc.assert(
      fc.property(cikArb, (cik) => {
        const r = pitRadius(cik);
        expect(r * 2).toBeGreaterThanOrEqual(0.5 - 1e-9);
        expect(r * 2).toBeLessThanOrEqual(0.9 + 1e-9);

        const n = clodCount(cik);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(CLOD_MIN);
        expect(n).toBeLessThanOrEqual(CLOD_MAX);

        const clods = clodsFor(cik);
        expect(clods).toHaveLength(n);
        for (const c of clods) {
          const d = Math.hypot(c.dx, c.dz);
          expect(d).toBeGreaterThanOrEqual(r + CLOD_GAP - 1e-9);
          expect(d).toBeLessThanOrEqual(CLOD_R_MAX + 1e-9);
          expect(d).toBeGreaterThan(r); // outside the Pit
          expect(c.scale).toBeGreaterThanOrEqual(CLOD_SCALE_MIN);
          expect(c.scale).toBeLessThanOrEqual(CLOD_SCALE_MAX);
        }

        // Raised rim: crest at r * RIM_AT is the highest point, above ground,
        // and the crater floor inside the Pit is below ground.
        const crest = tornMoundProfile(r * RIM_AT, r);
        expect(crest).toBeCloseTo(RIM_HEIGHT, 9);
        expect(crest).toBeGreaterThan(tornMoundProfile(r * 0.5, r));
        expect(crest).toBeGreaterThan(tornMoundProfile(r * 2, r));
        expect(tornMoundProfile(0, r)).toBeLessThan(0);

        // Deterministic per cik.
        expect(clodsFor(cik)).toEqual(clods);
        expect(pitRadius(cik)).toBe(r);
      }),
      { numRuns: 200 },
    );
  });
});
