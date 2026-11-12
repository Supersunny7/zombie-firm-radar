// Feature: asset-pipeline, Property 23: Bip01 skeleton check accepts exactly the Bip01-named skeletons
// **Validates: Requirements 34.3, 34.4**
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Document } from '@gltf-transform/core';
import { checkBip01, collectJointNames, assertBip01, bip01Message, BIP01_PATTERN_SOURCE } from './bip01.mjs';

const RE = /^Bip01([ _]|$)/;
const numRuns = 200;

const goodName = fc
  .tuple(fc.constantFrom('', ' ', '_'), fc.string({ maxLength: 12 }))
  .map(([sep, rest]) => (sep === '' ? 'Bip01' : `Bip01${sep}${rest}`));
const nearMiss = fc.constantFrom('bip01', 'Bip010', 'Bip02', 'Bip01x', ' Bip01', 'xBip01', 'mixamorig:Hips', 'Bip0', '');
const anyName = fc.oneof(goodName, nearMiss, fc.string({ maxLength: 16 }));

function docWithSkin(names) {
  const doc = new Document();
  const root = doc.createNode('Scene Root');
  const joints = names.map((n) => doc.createNode(n));
  joints.forEach((j) => root.addChild(j));
  const skin = doc.createSkin('skin');
  joints.forEach((j) => skin.addJoint(j));
  doc.createScene('s').addChild(root);
  return doc;
}

describe('Property 23: Bip01 skeleton check accepts exactly the Bip01-named skeletons', () => {
  it('accepts iff non-empty and every name matches; refusal names first offender and pattern', () => {
    fc.assert(
      fc.property(fc.array(anyName, { maxLength: 8 }), (joints) => {
        const r = checkBip01(joints);
        const expectOk = joints.length > 0 && joints.every((n) => RE.test(n));
        expect(r.ok).toBe(expectOk);
        if (!r.ok) {
          expect(r.offending).toBe(joints.length === 0 ? 'no joints' : joints.find((n) => !RE.test(n)));
          expect(r.expected).toBe(BIP01_PATTERN_SOURCE);
          expect(BIP01_PATTERN_SOURCE).toBe('^Bip01([ _]|$)');
        }
      }),
      { numRuns },
    );
  });

  it('accepts every all-Bip01 non-empty list', () => {
    fc.assert(
      fc.property(fc.array(goodName, { minLength: 1, maxLength: 8 }), (joints) => {
        expect(checkBip01(joints)).toEqual({ ok: true });
      }),
      { numRuns },
    );
  });

  it('a single bad name anywhere refuses, reporting the first bad one', () => {
    fc.assert(
      fc.property(
        fc.array(goodName, { maxLength: 5 }),
        nearMiss.filter((n) => !RE.test(n)),
        fc.array(anyName, { maxLength: 4 }),
        (prefix, bad, suffix) => {
          const r = checkBip01([...prefix, bad, ...suffix]);
          expect(r).toEqual({ ok: false, offending: bad, expected: BIP01_PATTERN_SOURCE });
        },
      ),
      { numRuns },
    );
  });

  it('collectJointNames / assertBip01 agree with checkBip01 on built documents', () => {
    fc.assert(
      fc.property(fc.array(anyName, { minLength: 1, maxLength: 6 }), (names) => {
        const doc = docWithSkin(names);
        expect(collectJointNames(doc)).toEqual(names);
        const r = checkBip01(names);
        if (r.ok) {
          expect(assertBip01(doc, 'anim-x')).toEqual({ ok: true, bip01: true });
        } else {
          expect(() => assertBip01(doc, 'anim-x')).toThrow(bip01Message('anim-x', r.offending, r.expected));
        }
      }),
      { numRuns },
    );
  });

  it('a document without skins is refused as "no joints"', () => {
    const doc = new Document();
    doc.createScene('s').addChild(doc.createNode('Bip01'));
    expect(collectJointNames(doc)).toEqual([]);
    expect(() => assertBip01(doc, 'a')).toThrow(/first offending joint: "no joints"/);
  });
});
