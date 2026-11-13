import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FALLEN_SINK_MAX, HEIGHT_FACTOR, OFFSET_MAX, YAW_MAX, stoneJitter } from './jitter';
import { HEIGHT_MAX, HEIGHT_MIN, computeLayout, type LayoutInput } from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const TILT_MAX = (8 * Math.PI) / 180;
const EPS = 1e-9;

// Feature: graveyard-horror-pass, Property 11: Jitter is bounded, local to the cik and deterministic
// **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.8, 8.10, 20.3**
describe('Property 11: Jitter is bounded, local to the cik and deterministic', () => {
  const listArb = firmsArb(400, 12);

  it('keeps offsets, yaw, height factor and tilt within bounds', () => {
    fc.assert(
      fc.property(listArb, (firms) => {
        const layout = computeLayout(firms);
        expect(layout.stones.length).toBe(firms.length);
        firms.forEach((f, i) => {
          const j = stoneJitter(f.cik);
          expect(Math.abs(j.dx)).toBeLessThanOrEqual(OFFSET_MAX);
          expect(Math.abs(j.dz)).toBeLessThanOrEqual(OFFSET_MAX);
          expect(Math.abs(j.yaw)).toBeLessThanOrEqual(YAW_MAX + EPS);
          expect(j.heightFactor).toBeGreaterThanOrEqual(HEIGHT_FACTOR[0]);
          expect(j.heightFactor).toBeLessThanOrEqual(HEIGHT_FACTOR[1]);
          expect(j.fallenSink).toBeGreaterThanOrEqual(0);
          expect(j.fallenSink).toBeLessThanOrEqual(FALLEN_SINK_MAX);

          const s = layout.stones[i]!;
          // Standing yaw and fallen flag come straight from the jitter.
          expect(s.standingYaw).toBe(j.yaw);
          expect(s.fallen).toBe(j.fallen);
          expect(Math.abs(s.standingYaw)).toBeLessThanOrEqual((20 * Math.PI) / 180 + EPS);
          // Height is the debt-mapped base height times the jitter factor.
          expect(s.height).toBeGreaterThanOrEqual(HEIGHT_MIN * HEIGHT_FACTOR[0] - EPS);
          expect(s.height).toBeLessThanOrEqual(HEIGHT_MAX * HEIGHT_FACTOR[1] + EPS);
          // Upright stones never tilt more than 8 degrees (pitch and roll combined).
          if (!s.fallen) {
            expect(Math.hypot(s.pitch, s.roll)).toBeLessThanOrEqual(TILT_MAX);
            expect(s.lean).toBeLessThanOrEqual(TILT_MAX);
          }
        });
      }),
      OPTS,
    );
  });

  it('is local to the cik: other firms never change a firm jitter', () => {
    fc.assert(
      fc.property(
        listArb.chain((firms) =>
          fc.record({
            firms: fc.constant(firms),
            keep: fc.array(fc.boolean(), { minLength: firms.length, maxLength: firms.length }),
          }),
        ),
        ({ firms, keep }) => {
          let subset: LayoutInput[] = firms.filter((_, i) => keep[i]);
          if (subset.length === 0) subset = [firms[0]!];
          const full = computeLayout(firms);
          const part = computeLayout(subset);
          const indexInFull = new Map(firms.map((f, i) => [f.cik, i]));
          subset.forEach((f, k) => {
            // The raw draw depends on the cik only.
            expect(stoneJitter(f.cik)).toEqual(stoneJitter(f.cik));
            const a = full.stones[indexInFull.get(f.cik)!]!;
            const b = part.stones[k]!;
            // Layout fields that come from the jitter alone are unchanged.
            expect(b.standingYaw).toBe(a.standingYaw);
            expect(b.fallen).toBe(a.fallen);
            expect(b.width).toBe(a.width);
            expect(b.depth).toBe(a.depth);
            expect(b.pitch).toBe(a.pitch);
            expect(b.roll).toBe(a.roll);
            expect(b.lean).toBe(a.lean);
            expect(b.yaw).toBe(a.yaw);
          });
        },
      ),
      OPTS,
    );
  });

  it('gives identical output on repeated runs, whatever the input order of other calls', () => {
    fc.assert(
      fc.property(listArb, (firms) => {
        const before = firms.map((f) => stoneJitter(f.cik));
        const a = computeLayout(firms);
        const b = computeLayout(firms.map((f) => ({ ...f })));
        expect(b).toEqual(a);
        // Jitter calls in between do not leak state.
        expect(firms.map((f) => stoneJitter(f.cik))).toEqual(before);
        // Reversed order: every firm keeps its own jitter.
        const rev = [...firms].reverse();
        rev.forEach((f) => {
          expect(stoneJitter(f.cik)).toEqual(before[firms.indexOf(f)]);
        });
      }),
      OPTS,
    );
  });
});
