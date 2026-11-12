import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { DECAL_TYPES, encodePng, generateDecal } from "./gen-decals.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");

describe("gen-decals", () => {
  for (const type of DECAL_TYPES) {
    it(`${type}: 512x512 RGBA, transparent and opaque pixels, colour in range`, () => {
      for (let variant = 0; variant < 3; variant++) {
        const { width, height, rgba } = generateDecal({ type, variant });
        expect(width).toBe(512);
        expect(height).toBe(512);
        expect(rgba.length).toBe(512 * 512 * 4);
        let zero = false, pos = false;
        for (let i = 0; i < rgba.length; i += 4) {
          const a = rgba[i + 3];
          if (a === 0) zero = true;
          if (a === 0) continue;
          pos = true;
          const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
          const v = Math.max(r, g, b) / 255;
          const mn = Math.min(r, g, b) / 255;
          const s = (v - mn) / v;
          expect(v).toBeGreaterThanOrEqual(0.12);
          expect(v).toBeLessThanOrEqual(0.45);
          expect(s).toBeGreaterThanOrEqual(0.45);
          expect(s).toBeLessThanOrEqual(0.75);
          expect(r).toBe(Math.max(r, g, b));
          const hue = r === mn ? 0 : g >= b ? (60 * (g - b)) / (r - mn) : 360 - (60 * (b - g)) / (r - mn);
          expect(Math.min(hue, 360 - hue)).toBeLessThanOrEqual(15);
        }
        expect(zero).toBe(true);
        expect(pos).toBe(true);
      }
    });

    it(`${type}: same seed gives identical bytes; variants differ`, async () => {
      const a = await encodePng(generateDecal({ type, variant: 1 }).rgba);
      const b = await encodePng(generateDecal({ type, variant: 1 }).rgba);
      expect(sha(a)).toBe(sha(b));
      const hashes = new Set();
      for (let v = 0; v < 3; v++) hashes.add(sha(Buffer.from(generateDecal({ type, variant: v }).rgba)));
      expect(hashes.size).toBe(3);
    });
  }
});
