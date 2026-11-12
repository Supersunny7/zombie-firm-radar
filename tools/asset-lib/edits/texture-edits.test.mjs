import { Document } from '@gltf-transform/core';
import fc from 'fast-check';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { applyEdits, EditTargetMissing } from './index.mjs';

const N = 16;

async function docWith(pixels) {
  const buf = await sharp(Buffer.from(pixels), { raw: { width: N, height: N, channels: 3 } }).png().toBuffer();
  const doc = new Document();
  const tex = doc.createTexture('tex').setImage(new Uint8Array(buf)).setMimeType('image/png');
  doc.createMaterial('m').setBaseColorTexture(tex);
  return doc;
}

async function read(doc) {
  const img = doc.getRoot().listTextures()[0].getImage();
  const { data } = await sharp(Buffer.from(img)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

function randomPixels(seed) {
  const px = new Uint8Array(N * N * 3);
  let a = seed;
  for (let i = 0; i < px.length; i++) {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    px[i] = a >>> 24;
  }
  return px;
}

describe('texture edits', () => {
  it('desaturate caps saturation and keeps value', async () => {
    const doc = await applyEdits(await docWith(randomPixels(1)), [{ op: 'desaturate', texture: 'tex', maxSaturation: 0.6 }]);
    const out = await read(doc);
    for (let i = 0; i < out.length; i += 3) {
      const mx = Math.max(out[i], out[i + 1], out[i + 2]);
      expect(mx - Math.min(out[i], out[i + 1], out[i + 2])).toBeLessThanOrEqual(0.6 * mx + 1); // 1 level of rounding
    }
  });

  it('darken brings the 99.5th percentile under maxValue', async () => {
    const doc = await applyEdits(await docWith(randomPixels(2)), [{ op: 'darken', texture: 'tex', maxValue: 40 }]);
    const out = await read(doc);
    const maxes = [];
    for (let i = 0; i < out.length; i += 3) maxes.push(Math.max(out[i], out[i + 1], out[i + 2]));
    maxes.sort((x, y) => x - y);
    expect(maxes[Math.ceil(0.995 * maxes.length) - 1]).toBeLessThanOrEqual(40);
  });

  it('grime is deterministic per seed, differs across seeds and respects the floor', async () => {
    const run = async (seed) =>
      read(await applyEdits(await docWith(new Uint8Array(N * N * 3).fill(255)), [{ op: 'grime', texture: 'tex', seed, floor: 100 }]));
    const a = await run(7);
    expect(Buffer.compare(a, await run(7))).toBe(0);
    expect(Buffer.compare(a, await run(8))).not.toBe(0);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(99);
    expect(Math.min(...a)).toBeLessThan(255);
  });

  it('is idempotent within 1 level (exact for grime)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1e6 }),
        fc.constantFrom(
          { op: 'desaturate', texture: 'tex', maxSaturation: 0.6 },
          { op: 'darken', texture: 'tex', maxValue: 150 },
          { op: 'grime', texture: 'tex', seed: 20260101, floor: 100 },
        ),
        async (s, edit) => {
          const once = await read(await applyEdits(await docWith(randomPixels(s)), [edit]));
          const twice = await read(await applyEdits(await docWith(randomPixels(s)), [edit, edit]));
          const tol = edit.op === 'grime' ? 0 : 1;
          for (let i = 0; i < once.length; i++) expect(Math.abs(once[i] - twice[i])).toBeLessThanOrEqual(tol);
        },
      ),
      { numRuns: 15 },
    );
  });

  it('missing texture: strict throws EditTargetMissing, tolerant is a no-op', async () => {
    const edit = [{ op: 'darken', texture: 'nope', maxValue: 10 }];
    await expect(applyEdits(await docWith(randomPixels(3)), edit, { strict: true })).rejects.toBeInstanceOf(EditTargetMissing);
    const doc = await docWith(randomPixels(3));
    const before = await read(doc);
    expect(Buffer.compare(before, await read(await applyEdits(doc, edit, { strict: false })))).toBe(0);
  });

  it('rejects out-of-range parameters', async () => {
    await expect(applyEdits(await docWith(randomPixels(4)), [{ op: 'desaturate', texture: 'tex', maxSaturation: 2 }])).rejects.toThrow(RangeError);
  });
});
