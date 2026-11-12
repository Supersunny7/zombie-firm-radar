// Feature: asset-pipeline, Property 21: Edit operations are idempotent and deterministic
// **Validates: Requirements 36.3, 36.4, 36.5, 36.6, 36.9**
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fc from 'fast-check';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { applyEdits, DecimateUnreachable } from './index.mjs';

const N = 16;

function grid(doc, buffer, n, material) {
  const pos = new Float32Array(n * n * 3);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) pos.set([x / (n - 1), Math.sin((x / (n - 1)) * 2) * 0.1, y / (n - 1)], (y * n + x) * 3);
  const idx = [];
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const a = y * n + x;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  return doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer))
    .setMaterial(material);
}

function boxes(doc, buffer, count, material) {
  const pos = new Float32Array(count * 8 * 3);
  const idx = [];
  const faces = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  for (let b = 0; b < count; b++) {
    for (let v = 0; v < 8; v++) pos.set([b * 3 + (v & 1), (v >> 1) & 1, (v >> 2) & 1], (b * 8 + v) * 3);
    for (const f of faces) idx.push(b * 8 + f);
  }
  return doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer))
    .setMaterial(material);
}

async function png(seed) {
  const px = new Uint8Array(N * N * 3);
  let a = seed;
  for (let i = 0; i < px.length; i++) {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    px[i] = a >>> 24;
  }
  return new Uint8Array(await sharp(Buffer.from(px), { raw: { width: N, height: N, channels: 3 } }).png().toBuffer());
}

/** Small doc built in code: two grids (~340 triangles), a box mesh to split, two materials with 16x16 textures. */
async function makeDoc(boxCount) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const std = doc.createMaterial('Standard').setBaseColorTexture(doc.createTexture('StdColor').setImage(await png(1)).setMimeType('image/png'));
  const rust = doc.createMaterial('Corroding').setBaseColorTexture(doc.createTexture('RustColor').setImage(await png(2)).setMimeType('image/png'));
  const scene = doc.createScene();
  scene.addChild(doc.createNode('A').setMesh(doc.createMesh('A').addPrimitive(grid(doc, buffer, 12, std))));
  scene.addChild(doc.createNode('B').setMesh(doc.createMesh('B').addPrimitive(grid(doc, buffer, 8, rust))));
  scene.addChild(doc.createNode('C').setMesh(doc.createMesh('Obj').addPrimitive(boxes(doc, buffer, boxCount, std))));
  return doc;
}

const sha = async (doc) => createHash('sha256').update(await new NodeIO().registerExtensions(ALL_EXTENSIONS).writeBinary(doc)).digest('hex');

async function pixels(doc) {
  const out = {};
  for (const t of doc.getRoot().listTextures()) {
    out[t.getName()] = (await sharp(Buffer.from(t.getImage())).removeAlpha().raw().toBuffer()).toString('base64');
  }
  return out;
}
const structure = (doc) =>
  JSON.stringify({
    nodes: doc.getRoot().listNodes().map((n) => [n.getName(), n.getMesh()?.getName() ?? null, n.getParentNode()?.getName() ?? null]),
    meshes: doc.getRoot().listMeshes().map((m) => [m.getName(), m.listPrimitives().map((p) => [p.getIndices().getCount(), p.getAttribute('POSITION').getCount()])]),
    materials: doc.getRoot().listMaterials().map((m) => m.getName()),
  });

const texName = fc.constantFrom('StdColor', 'RustColor', 'Missing');

/** A valid op with its box count requirement (splitMesh needs 3 boxes to name components 1 and 2). */
const geometryOp = fc.oneof(
  fc.integer({ min: 220, max: 330 }).map((triangles) => ({ op: 'decimate', triangles })),
  fc.constantFrom('A', 'B', 'C', 'Obj', 'Missing').map((node) => ({ op: 'removeNode', node })),
  fc.constantFrom('Standard', 'Corroding', 'StdColor', 'RustColor').map((variant) => ({ op: 'selectVariant', variant })),
  fc.constant({
    op: 'splitMesh',
    mesh: 'Obj',
    by: 'components',
    parts: [{ name: 'handle', components: [1] }, { name: 'blade', components: [2] }, { name: 'base', rest: true }],
  }),
);
const textureOp = fc.oneof(
  fc.record({ op: fc.constant('desaturate'), texture: texName, maxSaturation: fc.double({ min: 0, max: 1, noNaN: true }) }),
  fc.record({ op: fc.constant('darken'), texture: texName, maxValue: fc.integer({ min: 0, max: 255 }) }),
  fc.record({ op: fc.constant('grime'), texture: texName, seed: fc.integer({ min: 0, max: 1e9 }), floor: fc.integer({ min: 0, max: 255 }) }),
);
const anyOp = fc.oneof(geometryOp, textureOp);

describe('Property 21: edit operations are idempotent and deterministic', () => {
  it('a single op applied to its own output changes nothing (exact for geometry ops, within 1 level for colour ops)', async () => {
    await fc.assert(
      fc.asyncProperty(anyOp, async (edit) => {
        const doc = await makeDoc(3);
        // DecimateUnreachable is a documented typed outcome (no Blender fallback): not a valid input for this property.
        try {
          await applyEdits(doc, [edit], { strict: false });
        } catch (e) {
          if (e instanceof DecimateUnreachable) return;
          throw e;
        }
        const geoOnce = structure(doc);
        const pxOnce = await pixels(doc);
        const shaOnce = await sha(doc);
        await applyEdits(doc, [edit], { strict: false });
        expect(structure(doc)).toBe(geoOnce);
        const tolerant = edit.op === 'desaturate' || edit.op === 'darken' || edit.op === 'grime';
        if (!tolerant) {
          expect(await sha(doc)).toBe(shaOnce);
          return;
        }
        const pxTwice = await pixels(doc);
        expect(Object.keys(pxTwice)).toEqual(Object.keys(pxOnce));
        for (const name of Object.keys(pxOnce)) {
          const a = Buffer.from(pxOnce[name], 'base64');
          const b = Buffer.from(pxTwice[name], 'base64');
          for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 40 },
    );
  }, 280000);

  it('applying the same edit list to the same input twice gives identical GLB bytes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(anyOp, { minLength: 1, maxLength: 4 }), async (edits) => {
        const run = async () => {
          const doc = await makeDoc(3);
          try {
            await applyEdits(doc, edits, { strict: false });
          } catch (e) {
            if (e instanceof DecimateUnreachable) return 'DecimateUnreachable'; // deterministic typed outcome
            throw e;
          }
          return sha(doc);
        };
        expect(await run()).toBe(await run());
      }),
      { numRuns: 30 },
    );
  }, 280000);
});
