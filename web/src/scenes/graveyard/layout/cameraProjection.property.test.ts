import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PIT_FRONT } from './extents';
import { plotPose, projectToNdc } from './camera';
import { computeLayout } from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const FOV = 52;
/** Neutral pointer (centred) and sway 0: the pose is exactly plotPose. */
const ASPECTS: readonly (readonly [string, number])[] = [
  ['1440x900', 1440 / 900],
  ['390x844', 390 / 844],
];
/** Largest stone position jitter along z (jitter.ts: offsets at most 0.30 m). */
const JITTER_Z = 0.3;
/** Front row tolerance when picking stones near the first row anchor. */
const ROW_TOL = JITTER_Z + 1e-6;

// Feature: graveyard-horror-pass, Property 18: Nearest-row mound bases project into the lower half
describe('Property 18: nearest-row mound bases project into the lower half', () => {
  it('projects every front-row mound base of every framed plot below the screen centre (y <= -0.83 reported by 2.10)', () => {
    // Validates: Requirement 9.3 (framed pose, pointer centred, no sway)
    fc.assert(
      fc.property(firmsArb(60, 6), (firms) => {
        const layout = computeLayout(firms);
        for (const plot of layout.plots) {
          const rowZ = plot.rowAnchors[0]!;
          let checked = 0;
          for (const idx of plot.stones) {
            const s = layout.stones[idx]!;
            // Standing position z recovered from the Pit centre (fallen stones lie behind it).
            const standZ = s.pitCentre.z - Math.cos(s.standingYaw) * (s.depth / 2 + PIT_FRONT);
            if (Math.abs(standZ - rowZ) > ROW_TOL) continue;
            checked++;
            for (const [, aspect] of ASPECTS) {
              // The rig passes the viewport aspect: portrait aims lower (sky share), same FOV.
              const pose = plotPose(plot, aspect);
              const n = projectToNdc(pose, [s.pitCentre.x, 0, s.pitCentre.z], FOV, aspect);
              expect(n).not.toBeNull();
              expect(n!.y).toBeLessThan(0);
              // Desktop keeps the tighter bound; portrait only needs "lower half" (9.3).
              if (aspect >= 1) expect(n!.y).toBeLessThanOrEqual(-0.83);
            }
          }
          // The first row of a plot always has at least one stone.
          expect(checked).toBeGreaterThan(0);
        }
      }),
      OPTS,
    );
  });
});
