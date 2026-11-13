// Feature: graveyard-horror-pass, Property 47: Grade steps stay in range
// **Validates: Requirements 23.11**
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  gainLiftGamma,
  gainLiftGammaChannel,
  gradeColour,
  luma,
  saturate,
  vignette,
  vignetteFactor,
  vignetteRadius,
  type Rgb,
} from './gradeColour';

/**
 * Step (a) is a convex mix of values in [0, 1] and is not clamped, so the float result
 * may sit one rounding step outside the mathematical range. Steps (b) and (c) clamp and
 * are checked exactly.
 */
const EPS = 1e-12;

const unit = fc.double({ min: 0, max: 1, noNaN: true });
const rgbArb: fc.Arbitrary<Rgb> = fc.tuple(unit, unit, unit);
const uvArb = fc.tuple(unit, unit);

function expectInUnit(rgb: Rgb, eps = 0): void {
  for (const c of rgb) {
    expect(c).toBeGreaterThanOrEqual(0 - eps);
    expect(c).toBeLessThanOrEqual(1 + eps);
  }
}

describe('Property 47: Grade steps stay in range', () => {
  it('keeps every step in [0, 1], grey stays grey, vignette is 1 at the centre and the steps compose to gradeColour', () => {
    fc.assert(
      fc.property(rgbArb, uvArb, uvArb, unit, unit, (rgb, [u, v], [u2, v2], a, b) => {
        // (a) saturation: in range, preserves luma.
        const sat = saturate(rgb);
        expectInUnit(sat, EPS);
        expect(Math.abs(luma(sat) - luma(rgb))).toBeLessThanOrEqual(EPS);

        // (a) a grey input stays grey.
        const grey = saturate([a, a, a]);
        expect(grey[1]).toBe(grey[0]);
        expect(grey[2]).toBe(grey[0]);

        // (b) gain, lift, gamma: in range and monotone non-decreasing per channel.
        const glg = gainLiftGamma(sat);
        expectInUnit(glg);
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        expect(gainLiftGammaChannel(lo)).toBeLessThanOrEqual(gainLiftGammaChannel(hi));

        // (c) vignette factor: in [0, 1], 1 at the centre, non-increasing with radius.
        const f = vignetteFactor(u, v);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
        expect(vignetteFactor(0.5, 0.5)).toBe(1);
        const f2 = vignetteFactor(u2, v2);
        if (vignetteRadius(u, v) <= vignetteRadius(u2, v2)) {
          expect(f).toBeGreaterThanOrEqual(f2);
        } else {
          expect(f2).toBeGreaterThanOrEqual(f);
        }

        // (c) applied to the graded colour stays in range.
        const vig = vignette(glg, u, v);
        expectInUnit(vig);

        // Steps (a) to (c) in order equal gradeColour.
        expect(gradeColour(rgb, u, v)).toEqual(vig);
      }),
      { numRuns: 200 },
    );
  });
});
