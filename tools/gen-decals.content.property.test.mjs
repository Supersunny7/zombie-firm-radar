import { describe, it } from "vitest";
import fc from "fast-check";
import { DECAL_TYPES, generateDecal } from "./gen-decals.mjs";

// Feature: asset-pipeline, Property 18: Decal images have the required size, alpha and colour range
// **Validates: Requirements 38.5, 38.6, 38.8**

// Returns a description of the first violation, or null.
function checkDecal({ width, height, rgba }) {
  if (width !== 512 || height !== 512) return `size ${width}x${height}`;
  if (rgba.length !== 512 * 512 * 4) return `rgba length ${rgba.length}`;
  let zero = false;
  let pos = false;
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a === 0) {
      zero = true;
      continue;
    }
    pos = true;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const v = mx / 255;
    const s = mx === 0 ? 0 : (mx - mn) / mx;
    let hue = 0;
    if (mx !== mn) {
      if (mx === r) hue = (60 * (g - b)) / (mx - mn);
      else if (mx === g) hue = 120 + (60 * (b - r)) / (mx - mn);
      else hue = 240 + (60 * (r - g)) / (mx - mn);
      hue = ((hue % 360) + 360) % 360;
    }
    const dist = Math.min(hue, 360 - hue);
    const px = `pixel ${i / 4} rgba(${r},${g},${b},${a})`;
    if (dist > 15) return `hue ${dist} at ${px}`;
    if (s < 0.45 || s > 0.75) return `saturation ${s} at ${px}`;
    if (v < 0.12 || v > 0.45) return `value ${v} at ${px}`;
  }
  if (!zero) return "no fully transparent pixel";
  if (!pos) return "no pixel with alpha above 0";
  return null;
}

describe("Property 18: decal image content", () => {
  it("every generated decal is 512x512 RGBA with transparent and opaque pixels and red-range colour", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DECAL_TYPES),
        fc.oneof(
          fc.record({ variant: fc.integer({ min: 0, max: 50 }), seed: fc.constant(undefined) }),
          fc.record({ variant: fc.constant(0), seed: fc.integer({ min: 0, max: 0xffffffff }) }),
        ),
        (type, { variant, seed }) => {
          const violation = checkDecal(generateDecal({ type, variant, seed }));
          return violation === null || (() => { throw new Error(violation); })();
        },
      ),
      { numRuns: 30 },
    );
  }, 240_000);
});
