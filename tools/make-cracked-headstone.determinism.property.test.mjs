import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Document } from '@gltf-transform/core';
import fc from 'fast-check';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isCracked, makeCrackedHeadstone, readModel, writeModel } from './make-cracked-headstone.mjs';

const N = 4; // grid cells per face

/** Tiny box with per-face vertices (UV seams), UVs and a 64x64 flat normal map. Built in code. */
async function buildStone() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = [], uv = [], idx = [];
  const W = 1, H = 1.5, D = 0.2;
  const faces = [
    { o: [-W / 2, 0, D / 2], u: [W, 0, 0], v: [0, H, 0] },
    { o: [W / 2, 0, -D / 2], u: [-W, 0, 0], v: [0, H, 0] },
    { o: [-W / 2, 0, -D / 2], u: [0, 0, D], v: [0, H, 0] },
    { o: [W / 2, 0, D / 2], u: [0, 0, -D], v: [0, H, 0] },
    { o: [-W / 2, H, D / 2], u: [W, 0, 0], v: [0, 0, -D] },
    { o: [-W / 2, 0, -D / 2], u: [W, 0, 0], v: [0, 0, D] },
  ];
  for (const f of faces) {
    const base = pos.length / 3;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const s = i / N, t = j / N;
        pos.push(f.o[0] + f.u[0] * s + f.v[0] * t, f.o[1] + f.u[1] * s + f.v[1] * t, f.o[2] + f.u[2] * s + f.v[2] * t);
        uv.push(s, 1 - t);
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer));
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 128, g: 128, b: 255 } } }).png().toBuffer();
  const mat = doc.createMaterial('stone').setNormalTexture(doc.createTexture('n').setImage(new Uint8Array(png)).setMimeType('image/png'));
  prim.setMaterial(mat);
  const mesh = doc.createMesh('stone').addPrimitive(prim);
  doc.getRoot().setDefaultScene(doc.createScene().addChild(doc.createNode('stone').setMesh(mesh)));
  return doc;
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

describe('cracked headstone determinism', () => {
  let tmp;
  beforeAll(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), 'cracked-det-'));
  });
  afterAll(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  const derive = async (seed, file) => {
    const doc = await buildStone();
    await makeCrackedHeadstone(doc, { seed });
    await writeModel(doc, file);
    return sha(await readFile(file));
  };

  // Feature: asset-pipeline, Property 20: Cracked headstone derivation is deterministic
  // **Validates: Requirements 39.2, 39.3**
  it('same input and seed give byte-identical GLBs, different seeds differ, a second run is a no-op', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 1, max: 0xffffffff }),
        async (seed, delta) => {
          const other = (seed + delta) % 0x100000000;
          const a = path.join(tmp, 'a.glb');
          const b = path.join(tmp, 'b.glb');
          const c = path.join(tmp, 'c.glb');
          const hashA = await derive(seed, a);
          const hashB = await derive(seed, b);
          expect(hashB).toBe(hashA);
          expect(await derive(other, c)).not.toBe(hashA);

          // Re-running on its own output changes nothing.
          const reread = await readModel(a);
          expect(isCracked(reread)).toBe(true);
          const baseline = path.join(tmp, 'base.glb');
          await writeModel(reread, baseline);
          const again = await readModel(a);
          await makeCrackedHeadstone(again, { seed: other });
          const second = path.join(tmp, 'second.glb');
          await writeModel(again, second);
          expect(sha(await readFile(second))).toBe(sha(await readFile(baseline)));
        },
      ),
      { numRuns: 10 },
    );
  }, 280000);
});
