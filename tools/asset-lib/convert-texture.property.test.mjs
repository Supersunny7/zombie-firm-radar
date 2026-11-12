// Feature: asset-pipeline, Property 14: Texture size limit preserves aspect ratio
// **Validates: Requirements 16.6**
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  convertTexture, fitInside, sizeWarning, textureLimit, webpOptions, WARN_BYTES,
} from './convert-texture.mjs';

let dir;
beforeEach(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'tex-prop-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

const dim = fc.integer({ min: 1, max: 20000 });
const limit = fc.constantFrom(1024, 2048);

describe('Property 14: Texture size limit preserves aspect ratio', () => {
  it('fitInside: longest side = min(max(w,h), L), never enlarges, ratio within one pixel', () => {
    fc.assert(fc.property(dim, dim, limit, (w, h, L) => {
      const r = fitInside(w, h, L);
      expect(Math.max(r.width, r.height)).toBe(Math.min(Math.max(w, h), L));
      expect(r.width).toBeGreaterThanOrEqual(1);
      expect(r.height).toBeGreaterThanOrEqual(1);
      expect(r.width).toBeLessThanOrEqual(w);
      expect(r.height).toBeLessThanOrEqual(h);
      const scale = Math.max(r.width, r.height) / Math.max(w, h);
      expect(Math.abs(r.width - w * scale)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.height - h * scale)).toBeLessThanOrEqual(1);
      // Orientation is kept.
      if (w > h) expect(r.width).toBeGreaterThanOrEqual(r.height);
      if (h > w) expect(r.height).toBeGreaterThanOrEqual(r.width);
    }), { numRuns: 300 });
  });

  it('fitInside: images already inside the limit are returned unchanged', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 1024 }), fc.integer({ min: 1, max: 1024 }), limit, (w, h, L) => {
      expect(fitInside(w, h, L)).toEqual({ width: w, height: h });
    }), { numRuns: 100 });
  });

  it('textureLimit is 2048 if and only if the role is ground-main', () => {
    fc.assert(fc.property(
      fc.option(fc.oneof(fc.constantFrom('ground-main', 'background', 'environment'), fc.string()), { nil: undefined }),
      (role) => {
        expect(textureLimit({ id: 'x', role })).toBe(role === 'ground-main' ? 2048 : 1024);
      },
    ), { numRuns: 100 });
  });

  it('webpOptions: normal maps use quality 90 without near-lossless, others 82; effort 4', () => {
    fc.assert(fc.property(fc.constantFrom('color', 'rough', 'ao', 'arm', 'displacement'), (map) => {
      expect(webpOptions(map)).toMatchObject({ quality: 82, effort: 4 });
    }), { numRuns: 100 });
    for (const map of ['normal', 'nor_gl', 'nor_dx']) {
      expect(webpOptions(map)).toMatchObject({ quality: 90, nearLossless: false, effort: 4 });
    }
  });

  it('sizeWarning: null at or below 5 MiB, a message with a suggestion above', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 100_000_000 }), (bytes) => {
      const msg = sizeWarning('a.webp', bytes);
      if (bytes <= WARN_BYTES) expect(msg).toBeNull();
      else {
        expect(msg).toContain('a.webp');
        expect(msg).toMatch(/Suggestion/);
      }
    }), { numRuns: 200 });
  });

  it('convertTexture: written WebP matches fitInside and never exceeds the limit', async () => {
    await fc.assert(fc.asyncProperty(
      fc.integer({ min: 1, max: 2300 }), fc.integer({ min: 1, max: 3 }), fc.boolean(), fc.boolean(),
      async (long, short, wide, groundMain) => {
        const w = wide ? long : short;
        const h = wide ? short : long;
        const src = path.join(dir, 'in.png');
        const png = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 90, g: 90, b: 90 } } }).png().toBuffer();
        await writeFile(src, png);
        const pick = groundMain ? { id: 'p', role: 'ground-main' } : { id: 'p' };
        const out = path.join(dir, 'out');
        const { files } = await convertTexture(pick, [{ map: 'color', path: src }], out);
        const expected = fitInside(w, h, textureLimit(pick));
        const meta = await sharp(await readFile(path.join(out, 'p_color.webp'))).metadata();
        expect(meta.format).toBe('webp');
        expect({ width: meta.width, height: meta.height }).toEqual(expected);
        expect({ width: files[0].width, height: files[0].height }).toEqual(expected);
        expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(groundMain ? 2048 : 1024);
      },
    ), { numRuns: 20 });
  }, 120000);
});
