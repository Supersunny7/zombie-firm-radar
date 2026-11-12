import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { applyEdits, EditTargetMissing } from './index.mjs';
function twoMaterialMesh() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh('Body');
  for (const name of ['hat', 'visor']) {
    const pos = doc.createAccessor().setType('VEC3').setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])).setBuffer(buffer);
    mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', pos).setMaterial(doc.createMaterial(name)));
  }
  doc.createScene().addChild(doc.createNode('Body').setMesh(mesh));
  return doc;
}
describe('removeNode by material', () => {
  it('drops only the primitives of that material and keeps the rest of the mesh', async () => {
    const doc = twoMaterialMesh();
    await applyEdits(doc, [{ op: 'removeNode', material: 'visor' }]);
    const prims = doc.getRoot().listMeshes()[0].listPrimitives();
    expect(prims.map((p) => p.getMaterial().getName())).toEqual(['hat']);
    expect(doc.getRoot().listMaterials().map((m) => m.getName())).toEqual(['hat']);
  });
  it('throws EditTargetMissing in strict mode and is idempotent when tolerant', async () => {
    const doc = twoMaterialMesh();
    await expect(applyEdits(doc, [{ op: 'removeNode', material: 'nope' }])).rejects.toBeInstanceOf(EditTargetMissing);
    await applyEdits(doc, [{ op: 'removeNode', material: 'visor' }, { op: 'removeNode', material: 'visor' }], { strict: false });
    expect(doc.getRoot().listMeshes()[0].listPrimitives().length).toBe(1);
  });
});
