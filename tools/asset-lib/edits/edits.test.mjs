import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsVariants } from '@gltf-transform/extensions';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { applyEdits, countTriangles, DecimateUnreachable, EditNotImplemented, EditTargetMissing } from './index.mjs';

/** A smooth n x n height field: 2*(n-1)^2 triangles. */
function addGrid(doc, buffer, n, material) {
  const pos = new Float32Array(n * n * 3);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 3;
      pos[i] = x / (n - 1);
      pos[i + 1] = Math.sin((x / (n - 1)) * 2) * 0.1;
      pos[i + 2] = y / (n - 1);
    }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6);
  let k = 0;
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const a = y * n + x;
      idx.set([a, a + n, a + 1, a + 1, a + n, a + n + 1], k);
      k += 6;
    }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
  if (material) prim.setMaterial(material);
  return prim;
}

function sceneWith(parts) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  for (const { name, mesh, n, material, parent } of parts) {
    const m = doc.createMesh(mesh ?? name).addPrimitive(addGrid(doc, buffer, n ?? 3, material));
    const node = doc.createNode(name).setMesh(m);
    (parent ? doc.getRoot().listNodes().find((x) => x.getName() === parent).addChild(node) : scene.addChild(node));
  }
  return doc;
}

const names = (doc) => doc.getRoot().listNodes().map((n) => n.getName()).sort();
const sha = async (doc) => createHash('sha256').update(await new NodeIO().registerExtensions(ALL_EXTENSIONS).writeBinary(doc)).digest('hex');

describe('applyEdits', () => {
  it('runs edits in list order and rejects ops that are not registered yet', async () => {
    const doc = sceneWith([{ name: 'A' }, { name: 'B' }]);
    await applyEdits(doc, [{ op: 'removeNode', node: 'A' }, { op: 'removeNode', node: 'A' }], { strict: false });
    expect(names(doc)).toEqual(['B']);
    await expect(applyEdits(doc, [{ op: 'splitMesh' }])).rejects.toBeInstanceOf(EditNotImplemented);
  });
});

describe('decimate', () => {
  it('reduces the total to at most the target', async () => {
    const doc = sceneWith([{ name: 'Hi', n: 40 }]);
    expect(countTriangles(doc)).toBe(2 * 39 * 39);
    await applyEdits(doc, [{ op: 'decimate', triangles: 1000 }]);
    expect(countTriangles(doc)).toBeLessThanOrEqual(1000);
    expect(countTriangles(doc)).toBeGreaterThan(0);
  });
  it('leaves a model at or below the target unchanged', async () => {
    const doc = sceneWith([{ name: 'Lo', n: 5 }]);
    const before = await sha(doc);
    await applyEdits(doc, [{ op: 'decimate', triangles: 32 }]);
    expect(await sha(doc)).toBe(before);
  });
  it('is idempotent and deterministic', async () => {
    const edits = [{ op: 'decimate', triangles: 500 }];
    const a = await applyEdits(sceneWith([{ name: 'Hi', n: 40 }]), edits);
    const b = await applyEdits(sceneWith([{ name: 'Hi', n: 40 }]), edits);
    const once = await sha(a);
    expect(await sha(b)).toBe(once);
    await applyEdits(a, edits);
    expect(await sha(a)).toBe(once);
  });
  it('throws a typed error when the target cannot be reached', async () => {
    const doc = sceneWith([{ name: 'Hi', n: 40 }]);
    await expect(applyEdits(doc, [{ op: 'decimate', triangles: 1 }], { pick: 'p' })).rejects.toBeInstanceOf(DecimateUnreachable);
  });
});

describe('removeNode', () => {
  it('removes a node with its children and keeps every other node', async () => {
    const doc = sceneWith([{ name: 'Crutch' }, { name: 'Bolt', parent: 'Crutch' }, { name: 'Drip' }]);
    await applyEdits(doc, [{ op: 'removeNode', node: 'Crutch' }]);
    expect(names(doc)).toEqual(['Drip']);
    expect(doc.getRoot().listMeshes().map((m) => m.getName())).toEqual(['Drip']);
    expect(doc.getRoot().listAccessors().length).toBe(2); // the removed meshes' accessors were pruned
  });
  it('removes a named mesh and the nodes left empty', async () => {
    const doc = sceneWith([{ name: 'N1', mesh: 'Object_0' }, { name: 'N2', mesh: 'Object_1' }]);
    await applyEdits(doc, [{ op: 'removeNode', mesh: 'Object_0' }]);
    expect(names(doc)).toEqual(['N2']);
  });
  it('throws EditTargetMissing in strict mode and is a no-op in tolerant mode', async () => {
    const doc = sceneWith([{ name: 'A' }]);
    const err = await applyEdits(doc, [{ op: 'removeNode', node: 'Nope' }], { pick: 'my-pick' }).catch((e) => e);
    expect(err).toBeInstanceOf(EditTargetMissing);
    expect(err.message).toContain('my-pick');
    expect(err.message).toContain('removeNode');
    expect(err.message).toContain('Nope');
    await applyEdits(doc, [{ op: 'removeNode', node: 'Nope' }], { strict: false });
    expect(names(doc)).toEqual(['A']);
  });
  it('is idempotent', async () => {
    const edits = [{ op: 'removeNode', node: 'A' }];
    const doc = sceneWith([{ name: 'A' }, { name: 'B' }]);
    await applyEdits(doc, edits);
    const once = await sha(doc);
    await applyEdits(doc, edits, { strict: false });
    expect(await sha(doc)).toBe(once);
  });
});

describe('selectVariant', () => {
  function twoMaterials() {
    const doc = new Document();
    const std = doc.createMaterial('Standard').setBaseColorTexture(doc.createTexture('StdColor').setImage(new Uint8Array([1])).setMimeType('image/png'));
    const rust = doc.createMaterial('Corroding').setBaseColorTexture(doc.createTexture('RustColor').setImage(new Uint8Array([2])).setMimeType('image/png'));
    const buffer = doc.createBuffer();
    const scene = doc.createScene();
    for (const [name, mat] of [['Open', std], ['Std', std], ['Rust', rust]]) {
      scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(addGrid(doc, buffer, 3, mat))));
    }
    return doc;
  }
  it('keeps only the named material and drops the others with their textures', async () => {
    const doc = twoMaterials();
    await applyEdits(doc, [{ op: 'selectVariant', variant: 'Standard' }]);
    expect(names(doc)).toEqual(['Open', 'Std']);
    expect(doc.getRoot().listMaterials().map((m) => m.getName())).toEqual(['Standard']);
    expect(doc.getRoot().listTextures().map((t) => t.getName())).toEqual(['StdColor']);
  });
  it('keeps only the named texture', async () => {
    const doc = twoMaterials();
    await applyEdits(doc, [{ op: 'selectVariant', variant: 'RustColor' }]);
    expect(names(doc)).toEqual(['Rust']);
  });
  it('resolves a KHR_materials_variants name', async () => {
    const doc = twoMaterials();
    const ext = doc.createExtension(KHRMaterialsVariants);
    const vA = ext.createVariant('Clean');
    const vB = ext.createVariant('Rusty');
    const [std, rust] = doc.getRoot().listMaterials();
    for (const mesh of doc.getRoot().listMeshes()) {
      mesh.listPrimitives()[0].setExtension(
        'KHR_materials_variants',
        ext.createMappingList().addMapping(ext.createMapping().addVariant(vA).setMaterial(std)).addMapping(ext.createMapping().addVariant(vB).setMaterial(rust)),
      );
    }
    await applyEdits(doc, [{ op: 'selectVariant', variant: 'Rusty' }]);
    expect(doc.getRoot().listMaterials().map((m) => m.getName())).toEqual(['Corroding']);
    expect(doc.getRoot().listMeshes().every((m) => m.listPrimitives()[0].getMaterial().getName() === 'Corroding')).toBe(true);
    expect(ext.listVariants()).toEqual([]);
  });
  it('throws EditTargetMissing in strict mode, no-op in tolerant mode, idempotent', async () => {
    const doc = twoMaterials();
    await expect(applyEdits(doc, [{ op: 'selectVariant', variant: 'Nope' }], { pick: 'p' })).rejects.toBeInstanceOf(EditTargetMissing);
    const edits = [{ op: 'selectVariant', variant: 'Standard' }];
    await applyEdits(doc, edits);
    const once = await sha(doc);
    await applyEdits(doc, edits, { strict: false });
    expect(await sha(doc)).toBe(once);
  });
});
