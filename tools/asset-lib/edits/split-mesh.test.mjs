import { Document, NodeIO } from '@gltf-transform/core';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { applyEdits, countTriangles, EditTargetMissing, SplitImpossible } from './index.mjs';

/** One mesh "Obj" with one primitive holding `boxes` disjoint 12-triangle boxes (8 vertices each). */
function boxesDoc(boxes = 3) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = new Float32Array(boxes * 8 * 3);
  const idx = [];
  const faces = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  for (let b = 0; b < boxes; b++) {
    for (let v = 0; v < 8; v++) pos.set([b * 3 + (v & 1), (v >> 1) & 1, (v >> 2) & 1], (b * 8 + v) * 3);
    for (const f of faces) idx.push(b * 8 + f);
  }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
  const parent = doc.createNode('Holder').setTranslation([1, 2, 3]);
  parent.addChild(doc.createNode('N').setMesh(doc.createMesh('Obj').addPrimitive(prim)));
  doc.createScene().addChild(parent);
  return doc;
}

const edit = {
  op: 'splitMesh',
  mesh: 'Obj',
  by: 'components',
  parts: [
    { name: 'handle', components: [1] },
    { name: 'blade', components: [2] },
    { name: 'base', rest: true },
  ],
};
const trisOf = (doc, name) => doc.getRoot().listMeshes().find((m) => m.getName() === name).listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
const sha = async (doc) => createHash('sha256').update(await new NodeIO().writeBinary(doc)).digest('hex');

describe('splitMesh', () => {
  it('splits by connected components into named part nodes, every triangle once', async () => {
    const doc = boxesDoc(3);
    await applyEdits(doc, [edit]);
    expect(countTriangles(doc)).toBe(36);
    expect(['handle', 'blade', 'base'].map((n) => trisOf(doc, n))).toEqual([12, 12, 12]);
    const nodes = doc.getRoot().listNodes();
    for (const n of ['handle', 'blade', 'base']) {
      const node = nodes.find((x) => x.getName() === n);
      expect(node.getMesh().getName()).toBe(n);
      expect(node.getParentNode().getName()).toBe('N');
    }
    expect(doc.getRoot().listMeshes().find((m) => m.getName() === 'Obj')).toBeUndefined();
    // compacted vertices: each part holds exactly one box
    expect(doc.getRoot().listMeshes().find((m) => m.getName() === 'blade').listPrimitives()[0].getAttribute('POSITION').getCount()).toBe(8);
  });

  it('numbers components by first triangle and keeps vertex data of the chosen box', async () => {
    const doc = boxesDoc(3);
    await applyEdits(doc, [{ ...edit, parts: [{ name: 'a', components: [2] }, { name: 'b', rest: true }] }]);
    const a = doc.getRoot().listMeshes().find((m) => m.getName() === 'a').listPrimitives()[0].getAttribute('POSITION');
    expect(a.getMin([])[0]).toBe(6);
    expect(trisOf(doc, 'b')).toBe(24);
  });

  it('splits by node: primitives become parts', async () => {
    const doc = boxesDoc(1);
    const mesh = doc.getRoot().listMeshes()[0];
    const first = mesh.listPrimitives()[0];
    mesh.addPrimitive(first.clone());
    await applyEdits(doc, [{ op: 'splitMesh', mesh: 'Obj', by: 'node', parts: [{ name: 'p0', components: [0] }, { name: 'p1', rest: true }] }]);
    expect([trisOf(doc, 'p0'), trisOf(doc, 'p1')]).toEqual([12, 12]);
  });

  it('is idempotent', async () => {
    const doc = boxesDoc(3);
    await applyEdits(doc, [edit]);
    const once = await sha(doc);
    await applyEdits(doc, [edit]); // strict: parts already present
    expect(await sha(doc)).toBe(once);
  });

  it('is deterministic', async () => {
    const a = await applyEdits(boxesDoc(3), [edit]);
    const b = await applyEdits(boxesDoc(3), [edit]);
    expect(await sha(a)).toBe(await sha(b));
  });

  it('throws SplitImpossible when a listed component does not exist, writing nothing', async () => {
    const doc = boxesDoc(1);
    const before = await sha(doc);
    const err = await applyEdits(doc, [edit], { pick: 'knife' }).catch((e) => e);
    expect(err).toBeInstanceOf(SplitImpossible);
    expect(err.message).toContain('knife');
    expect(await sha(doc)).toBe(before);
  });

  it('throws SplitImpossible when triangles belong to no part', async () => {
    const doc = boxesDoc(3);
    const parts = [{ name: 'handle', components: [0] }];
    await expect(applyEdits(doc, [{ ...edit, parts }])).rejects.toBeInstanceOf(SplitImpossible);
  });

  it('throws EditTargetMissing for an unknown mesh in strict mode', async () => {
    const doc = boxesDoc(3);
    await expect(applyEdits(doc, [{ ...edit, mesh: 'Nope' }], { pick: 'p' })).rejects.toBeInstanceOf(EditTargetMissing);
    await applyEdits(doc, [{ ...edit, mesh: 'Nope' }], { strict: false });
    expect(countTriangles(doc)).toBe(36);
  });
});
