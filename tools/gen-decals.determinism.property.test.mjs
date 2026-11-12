import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { DECAL_TYPES, generateDecal, encodePng } from "./gen-decals.mjs";

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const rgbaHash = (d) => sha(Buffer.from(d.rgba.buffer, d.rgba.byteOffset, d.rgba.byteLength));

// Run fn with the clock and Math.random stubbed to throw; always restore.
function withStubs(fn) {
  const spies = [
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Date.now used");
    }),
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random used");
    }),
  ];
  try {
    return fn();
  } finally {
    for (const s of spies) s.mockRestore();
  }
}

describe("decal generator determinism", () => {
  // Feature: asset-pipeline, Property 17: Decal generator is deterministic and seed-driven
  // **Validates: Requirements 38.3, 38.4, 38.7**
  it("same type/variant gives identical output with clock and Math.random stubbed; distinct variants differ", async () => {
    let run = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...DECAL_TYPES),
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 1, max: 15 }),
        async (type, variant, delta) => {
          const other = (variant + delta) % 16;
          const [a, b, c] = withStubs(() => [
            generateDecal({ type, variant }),
            generateDecal({ type, variant }),
            generateDecal({ type, variant: other }),
          ]);
          expect(rgbaHash(a)).toBe(rgbaHash(b));
          expect(rgbaHash(c)).not.toBe(rgbaHash(a));
          if (run++ < 2) {
            expect(sha(await encodePng(a.rgba))).toBe(sha(await encodePng(b.rgba)));
          }
        },
      ),
      { numRuns: 16 },
    );
  }, 280000);

  // Feature: asset-pipeline, Property 17: Decal generator is deterministic and seed-driven
  // **Validates: Requirements 38.3, 38.4, 38.7**
  it("explicit seeds are deterministic and distinct seeds differ", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DECAL_TYPES),
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 1, max: 0xfffffffe }),
        (type, seed, delta) => {
          const seed2 = (seed + delta) >>> 0;
          const [a, b, c] = withStubs(() => [
            generateDecal({ type, seed }),
            generateDecal({ type, seed }),
            generateDecal({ type, seed: seed2 }),
          ]);
          expect(rgbaHash(a)).toBe(rgbaHash(b));
          expect(rgbaHash(c)).not.toBe(rgbaHash(a));
        },
      ),
      { numRuns: 15 },
    );
  }, 280000);
});
