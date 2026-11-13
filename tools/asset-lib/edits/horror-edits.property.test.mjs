// Feature: graveyard-horror-pass, Property 1: Animation edits keep exactly what they are told to keep
// **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
import { Document } from '@gltf-transform/core';
import { KHRMaterialsPBRSpecularGlossiness } from '@gltf-transform/extensions';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyEdits, EditTargetMissing } from './index.mjs';

const SPEC_GLOSS = 'KHR_materials_pbrSpecularGlossiness';
const RUNS = { numRuns: 100 };

/** Skinned doc with `clipNames` clips; each clip animates a joint so prune keeps it. */
function makeDoc(clipNames, { specGloss = false } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const root = doc.createNode('Root');
  const joints = [doc.createNode('Bip01'), doc.createNode('Bip01_Spine'), doc.createNode('Bip01_Head')];
  root.addChild(joints[0]);
  joints[0].addChild(joints[1]);
  joints[1].addChild(joints[2]);

  const material = doc.createMaterial('Body');
  if (specGloss) {
    const ext = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
    material.setExtension(SPEC_GLOSS, ext.createPBRSpecularGlossiness());
  }
  const prim = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])).setBuffer(buffer),
    )
    .setMaterial(material);
  const mesh = doc.createMesh('Body').addPrimitive(prim);
  const ibm = doc
    .createAccessor()
    .setType('MAT4')
    .setArray(new Float32Array(joints.length * 16).map((_, i) => (i % 5 === 0 ? 1 : 0)))
    .setBuffer(buffer);
  const skin = doc.createSkin('Skin').setInverseBindMatrices(ibm);
  joints.forEach((j) => skin.addJoint(j));
  root.setMesh(mesh).setSkin(skin);
  doc.createScene('Scene').addChild(root);

  for (const name of clipNames) {
    const anim = doc.createAnimation(name);
    const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array([0, 1])).setBuffer(buffer);
    const output = doc.createAccessor().setType('VEC3').setArray(new Float32Array([0, 0, 0, 0, 1, 0])).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output);
    const channel = doc.createAnimationChannel().setTargetNode(joints[0]).setTargetPath('translation').setSampler(sampler);
    anim.addSampler(sampler).addChannel(channel);
  }
  return doc;
}

const clipNamesArb = fc.uniqueArray(fc.constantFrom('Idle', 'Walk1_InPlace', 'Attack', 'FallingForward', 'Run', 'Death'), {
  minLength: 0,
  maxLength: 6,
});
const absentArb = fc.constantFrom('Nope', 'Missing', 'Dance');

const names = (doc) =>
  doc
    .getRoot()
    .listAnimations()
    .map((a) => a.getName())
    .sort();
const structure = (doc) => ({
  meshes: doc.getRoot().listMeshes().length,
  skins: doc.getRoot().listSkins().length,
  joints: doc.getRoot().listSkins()[0]?.listJoints().map((j) => j.getName()),
  nodes: doc.getRoot().listNodes().length,
});

describe('Property 1: animation edits keep exactly what they are told to keep', () => {
  it('keepAnimations keeps exactly the named clips and is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(clipNamesArb, fc.subarray(['Idle', 'Walk1_InPlace', 'Attack', 'FallingForward', 'Run', 'Death']), async (clips, wanted) => {
        const keepNames = wanted.filter((n) => clips.includes(n));
        const doc = makeDoc(clips);
        const before = structure(doc);
        await applyEdits(doc, [{ op: 'keepAnimations', names: keepNames }], { strict: true });
        expect(names(doc)).toEqual([...keepNames].sort());
        expect(structure(doc)).toEqual(before);
        await applyEdits(doc, [{ op: 'keepAnimations', names: keepNames }], { strict: true });
        expect(names(doc)).toEqual([...keepNames].sort());
      }),
      RUNS,
    );
  });

  it('keepAnimations in strict mode throws EditTargetMissing for an absent clip, tolerant mode ignores it', async () => {
    await fc.assert(
      fc.asyncProperty(clipNamesArb, absentArb, async (clips, missing) => {
        const strictDoc = makeDoc(clips);
        await expect(
          applyEdits(strictDoc, [{ op: 'keepAnimations', names: [missing] }], { pick: 'p', strict: true }),
        ).rejects.toBeInstanceOf(EditTargetMissing);
        const tolerant = makeDoc(clips);
        await applyEdits(tolerant, [{ op: 'keepAnimations', names: [missing] }], { strict: false });
        expect(names(tolerant)).toEqual([]);
      }),
      RUNS,
    );
  });

  it('removeAnimations leaves zero clips and keeps meshes, skins and skeleton nodes; idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(clipNamesArb, async (clips) => {
        const doc = makeDoc(clips);
        const before = structure(doc);
        await applyEdits(doc, [{ op: 'removeAnimations' }]);
        expect(doc.getRoot().listAnimations()).toHaveLength(0);
        expect(structure(doc)).toEqual(before);
        await applyEdits(doc, [{ op: 'removeAnimations' }]);
        expect(doc.getRoot().listAnimations()).toHaveLength(0);
        expect(structure(doc)).toEqual(before);
      }),
      RUNS,
    );
  });

  it('specGlossToMetalRough leaves no spec-gloss extension, is a no-op without it, and is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(clipNamesArb, fc.boolean(), async (clips, specGloss) => {
        const doc = makeDoc(clips, { specGloss });
        const used = () => doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === SPEC_GLOSS);
        expect(used()).toBe(specGloss);
        const before = { ...structure(doc), clips: names(doc), materials: doc.getRoot().listMaterials().length };
        await applyEdits(doc, [{ op: 'specGlossToMetalRough' }]);
        expect(used()).toBe(false);
        expect(doc.getRoot().listMaterials().every((m) => m.getExtension(SPEC_GLOSS) == null)).toBe(true);
        if (!specGloss) expect(doc.getRoot().listExtensionsUsed()).toHaveLength(0);
        await applyEdits(doc, [{ op: 'specGlossToMetalRough' }]);
        expect(used()).toBe(false);
        expect({ ...structure(doc), clips: names(doc), materials: doc.getRoot().listMaterials().length }).toEqual(before);
      }),
      RUNS,
    );
  });
});
