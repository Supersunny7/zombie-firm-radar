import { Document } from '@gltf-transform/core';
import fc from 'fast-check';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CrackedHeadstoneImpossible, isCracked, MAP_SIZE, makeCrackedHeadstone } from './make-cracked-headstone.mjs';
import { countTriangles } from './asset-lib/edits/decimate.mjs';

/** Box-like headstone, n x n cells per face, 12 * n * n triangles, UVs optional, optional 64x64 flat normal map. */
async function buildStone({ n, width, height, uvs = true, normalMap = true }) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = [], uv = [], idx = [];
  const W = width, H = height, D = width * 0.2;
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
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const s = i / n, t = j / n;
        pos.push(f.o[0] + f.u[0] * s + f.v[0] * t, f.o[1] + f.u[1] * s + f.v[1] * t, f.o[2] + f.u[2] * s + f.v[2] * t);
        uv.push(s, 1 - t);
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = base + j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer));
  if (uvs) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
  const mat = doc.createMaterial('stone');
  if (normalMap) {
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 128, g: 128, b: 255 } } }).png().toBuffer();
    mat.setNormalTexture(doc.createTexture('n').setImage(new Uint8Array(png)).setMimeType('image/png'));
  }
  prim.setMaterial(mat);
  const mesh = doc.createMesh('stone').addPrimitive(prim);
  const scene = doc.createScene().addChild(doc.createNode('stone').setMesh(mesh));
  doc.getRoot().setDefaultScene(scene);
  return doc;
}

function heightOf(doc) {
  let lo = Infinity, hi = -Infinity;
  const v = [0, 0, 0];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const acc = prim.getAttribute('POSITION');
      for (let i = 0; i < acc.getCount(); i++) {
        acc.getElement(i, v);
        lo = Math.min(lo, v[1]);
        hi = Math.max(hi, v[1]);
      }
    }
  }
  return hi - lo;
}

// Grid sizes: 1 -> 12 triangles ... 45 -> 24,300 (above the 20,000 limit, so decimation runs).
const gridSize = fc.oneof(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 41, max: 45 }));

describe('cracked headstone limits', () => {
  it('Property 19: Cracked headstone stays within the triangle limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        gridSize,
        fc.double({ min: 0.5, max: 2, noNaN: true }),
        fc.double({ min: 0.8, max: 3, noNaN: true }),
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.boolean(),
        async (n, width, height, seed, normalMap) => {
          const doc = await buildStone({ n, width, height, normalMap });
          const before = heightOf(doc);
          await makeCrackedHeadstone(doc, { seed });

          // at most 20,000 triangles
          expect(countTriangles(doc)).toBeLessThanOrEqual(20000);
          // same bounding-box height within 5 percent
          expect(Math.abs(heightOf(doc) - before) / before).toBeLessThan(0.05);
          expect(isCracked(doc)).toBe(true);

          // a normal map is present
          const tex = doc.getRoot().listMaterials()[0].getNormalTexture();
          expect(tex).not.toBeNull();
          const { data, info } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
          expect([info.width, info.height]).toEqual([MAP_SIZE, MAP_SIZE]);

          // the face stays blank: the crack covers only a minority of the map, the rest is still flat
          let flat = 0;
          const px = info.width * info.height;
          for (let i = 0; i < px; i++) {
            const o = i * info.channels;
            if (Math.abs(data[o] - 128) <= 2 && Math.abs(data[o + 1] - 128) <= 2 && data[o + 2] >= 250) flat++;
          }
          expect(flat / px).toBeGreaterThan(0.7);
        },
      ),
      { numRuns: 12 },
    );
  }, 280000);

  it('Property 19: refuses a model without UVs and leaves it unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 0, max: 0xffffffff }), async (n, seed) => {
        const doc = await buildStone({ n, width: 1, height: 1.5, uvs: false });
        const tris = countTriangles(doc);
        await expect(makeCrackedHeadstone(doc, { seed })).rejects.toBeInstanceOf(CrackedHeadstoneImpossible);
        expect(isCracked(doc)).toBe(false);
        expect(countTriangles(doc)).toBe(tris);
      }),
      { numRuns: 10 },
    );
  });
});
