// Feature: asset-pipeline, Property 22: Split and decimate preserve what they promise
// **Validates: Requirements 36.3, 36.4, 36.7**
import { Document } from '@gltf-transform/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyEdits, countTriangles, DecimateUnreachable } from './index.mjs';

const FACES = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];

/** Mesh "Obj" with `boxes` disjoint 12-triangle boxes; box b spans x in [3b, 3b+1]. */
function boxesDoc(boxes) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = new Float32Array(boxes * 8 * 3);
  const idx = [];
  for (let b = 0; b < boxes; b++) {
    for (let v = 0; v < 8; v++) pos.set([b * 3 + (v & 1), (v >> 1) & 1, (v >> 2) & 1], (b * 8 + v) * 3);
    for (const f of FACES) idx.push(b * 8 + f);
  }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
  const node = doc.createNode('N').setMesh(doc.createMesh('Obj').addPrimitive(prim));
  doc.createScene().addChild(node);
  return doc;
}

/** Indexed (shared-vertex) flat grid of n x n quads = 2 n^2 triangles. */
function gridDoc(n) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const w = n + 1;
  const pos = new Float32Array(w * w * 3);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) pos.set([x, y, 0], (y * w + x) * 3);
  const idx = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = y * w + x;
      idx.push(a, a + 1, a + w, a + 1, a + w + 1, a + w);
    }
  }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
  doc.createScene().addChild(doc.createNode('G').setMesh(doc.createMesh('Grid').addPrimitive(prim)));
  return doc;
}

/** Box ids (from x position) and triangle count of a part mesh. */
function partInfo(doc, name) {
  const mesh = doc.getRoot().listMeshes().find((m) => m.getName() === name);
  if (!mesh) return null;
  const boxes = [];
  let tris = 0;
  for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute('POSITION');
    const ix = p.getIndices();
    tris += ix.getCount() / 3;
    for (let i = 0; i < ix.getCount(); i += 3) boxes.push(Math.floor(pos.getElement(ix.getScalar(i), [0, 0, 0])[0] / 3));
  }
  return { tris, boxes, hasNode: doc.getRoot().listNodes().some((n) => n.getName() === name && n.getMesh() === mesh) };
}

// 2-6 boxes, k parts (1..boxes) each owning at least one box; optional rest part is part 0.
const splitCase = fc
  .integer({ min: 2, max: 6 })
  .chain((n) =>
    fc.integer({ min: 1, max: n }).chain((k) =>
      fc.record({
        n: fc.constant(n),
        k: fc.constant(k),
        owners: fc.array(fc.integer({ min: 0, max: k - 1 }), { minLength: n, maxLength: n }).filter((o) => new Set(o).size === k),
        useRest: fc.boolean(),
      }),
    ),
  );

describe('Property 22: splitMesh partitions triangles', () => {
  it('every triangle lands in exactly one named part and totals are preserved', async () => {
    await fc.assert(
      fc.asyncProperty(splitCase, async ({ n, k, owners, useRest }) => {
        const doc = boxesDoc(n);
        const names = Array.from({ length: k }, (_, i) => `part_${i}`);
        const parts = names.map((name, i) =>
          useRest && i === 0 ? { name, rest: true } : { name, components: owners.flatMap((o, c) => (o === i ? [c] : [])) },
        );
        const before = countTriangles(doc);
        await applyEdits(doc, [{ op: 'splitMesh', mesh: 'Obj', by: 'components', parts }]);

        expect(countTriangles(doc)).toBe(before);
        const seen = new Map(); // box -> part
        let sum = 0;
        for (let i = 0; i < k; i++) {
          const info = partInfo(doc, names[i]);
          expect(info).not.toBeNull(); // named part exists
          expect(info.hasNode).toBe(true);
          sum += info.tris;
          for (const box of info.boxes) {
            expect(seen.has(box) && seen.get(box) !== i).toBe(false); // never in two parts
            seen.set(box, i);
          }
          const expected = owners.flatMap((o, c) => (o === i ? [c] : []));
          expect(new Set(info.boxes)).toEqual(new Set(expected));
          expect(info.tris).toBe(12 * expected.length);
        }
        expect(sum).toBe(12 * n);
        expect([...seen.keys()].sort()).toEqual(Array.from({ length: n }, (_, b) => b));
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 22: decimate meets the target or says so', () => {
  it('result <= target or DecimateUnreachable; never grows; unchanged at or below target', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 31 }), fc.double({ min: 0.02, max: 1.5, noNaN: true }), async (n, factor) => {
        const doc = gridDoc(n);
        const before = countTriangles(doc);
        const target = Math.max(1, Math.floor(before * factor));
        let out;
        let error = null;
        try {
          out = await applyEdits(doc, [{ op: 'decimate', triangles: target }]);
        } catch (e) {
          error = e;
        }
        if (before <= target) {
          expect(error).toBeNull();
          expect(countTriangles(out)).toBe(before); // unchanged
        } else if (error) {
          expect(error).toBeInstanceOf(DecimateUnreachable);
          expect(countTriangles(doc)).toBe(before); // search ran on clones
        } else {
          expect(countTriangles(out)).toBeLessThanOrEqual(target);
        }
        if (!error) expect(countTriangles(out)).toBeLessThanOrEqual(before);
      }),
      { numRuns: 40 },
    );
  }, 240000);

  it('reaches a reasonable target on a grid (sanity, not only Unreachable)', async () => {
    const doc = gridDoc(20);
    await applyEdits(doc, [{ op: 'decimate', triangles: 400 }]);
    expect(countTriangles(doc)).toBeLessThanOrEqual(400);
  });
});
