import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';
import { checkBip01, collectJointNames, assertBip01, bip01Message } from './bip01.mjs';

function docWithSkin(names, { sceneRoot = 'Scene Root' } = {}) {
  const doc = new Document();
  const root = doc.createNode(sceneRoot);
  const joints = names.map((n) => doc.createNode(n));
  joints.forEach((j) => root.addChild(j));
  const skin = doc.createSkin('skin');
  joints.forEach((j) => skin.addJoint(j));
  doc.createScene('s').addChild(root);
  return doc;
}

describe('checkBip01', () => {
  it('accepts Bip01 joint lists', () => {
    expect(checkBip01(['Bip01', 'Bip01 Pelvis', 'Bip01 Spine', 'Bip01_Head'])).toEqual({ ok: true });
  });
  it('rejects Mixamo names with the first offending name', () => {
    const r = checkBip01(['Bip01', 'mixamorig:Hips', 'x']);
    expect(r).toEqual({ ok: false, offending: 'mixamorig:Hips', expected: '^Bip01([ _]|$)' });
  });
  it('rejects near-misses like Bip010 and bip01', () => {
    expect(checkBip01(['Bip010']).ok).toBe(false);
    expect(checkBip01(['bip01 Pelvis']).ok).toBe(false);
  });
  it('rejects an empty list as "no joints"', () => {
    expect(checkBip01([])).toMatchObject({ ok: false, offending: 'no joints' });
  });
});

describe('document check', () => {
  it('collects only skin joints and ignores the scene root', () => {
    const doc = docWithSkin(['Bip01', 'Bip01 Pelvis', 'Bip01 Spine1']);
    expect(collectJointNames(doc)).toEqual(['Bip01', 'Bip01 Pelvis', 'Bip01 Spine1']);
    expect(assertBip01(doc, 'avatar-a')).toEqual({ ok: true, bip01: true });
  });
  it('throws a message naming the pick, joint and pattern for a non-Bip01 skin', () => {
    const doc = docWithSkin(['mixamorig:Hips', 'mixamorig:Spine']);
    expect(() => assertBip01(doc, 'avatar-b')).toThrow(
      bip01Message('avatar-b', 'mixamorig:Hips'),
    );
    expect(() => assertBip01(doc, 'avatar-b')).toThrow(/avatar-b.*"mixamorig:Hips".*\^Bip01/);
  });
  it('fails a document with no skins', () => {
    expect(() => assertBip01(new Document(), 'avatar-c')).toThrow(/"no joints"/);
  });
});
