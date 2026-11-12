// Material guard tests (avatar-textures-missing-fix task 3.4).
// Validates: Requirements 2.1, 2.3, 2.4
import { Document } from '@gltf-transform/core';
import fc from 'fast-check';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  assertAvatarMaterials,
  avatarMaterialProblems,
  isOpacityMaterial,
  normalizeAvatarMaterials,
} from './avatar-materials.mjs';
import { AvatarTextureError } from './fbx-textures.mjs';

const webp = (size, rgba = [200, 100, 50, 255]) =>
  sharp(Buffer.alloc(size * size * 4).fill(0), { raw: { width: size, height: size, channels: 4 } })
    .composite([{ input: Buffer.from(rgba), raw: { width: 1, height: 1, channels: 4 }, tile: true }])
    .webp()
    .toBuffer();

/** spec: { name, texture: 'real'|'placeholder'|'none', factor, metallic, mode } */
async function build(specs) {
  const doc = new Document();
  const real = await webp(8);
  const hold = await webp(1, [255, 255, 0, 127]);
  for (const s of specs) {
    const m = doc
      .createMaterial(s.name)
      .setBaseColorFactor(s.factor ?? [1, 1, 1, 1])
      .setMetallicFactor(s.metallic ?? 0)
      .setAlphaMode(s.mode ?? 'OPAQUE');
    if (s.texture !== 'none') {
      const img = s.texture === 'placeholder' ? hold : real;
      m.setBaseColorTexture(doc.createTexture(`${s.name}_color`).setImage(new Uint8Array(img)).setMimeType('image/webp'));
    }
  }
  return doc;
}

const good = (name) => ({ name, texture: 'real', mode: name.endsWith('_opacity') ? 'MASK' : 'OPAQUE' });

describe('avatar material guard', () => {
  it('accepts correct materials', async () => {
    const doc = await build([good('f014_body'), good('f014_opacity')]);
    expect(await avatarMaterialProblems(doc)).toEqual([]);
  });

  it('rejects a 1x1 placeholder and names avatar, material and texture', async () => {
    const doc = await build([{ name: 'f014_body', texture: 'placeholder' }]);
    const err = await assertAvatarMaterials(doc, 'av-1', { stage: 'pre' }).catch((e) => e);
    expect(err).toBeInstanceOf(AvatarTextureError);
    expect(err.message).toMatch(/av-1/);
    expect(err.message).toMatch(/f014_body/);
    expect(err.message).toMatch(/placeholder/);
  });

  it('rejects a missing base colour texture', async () => {
    const doc = await build([{ name: 'f014_body', texture: 'none' }]);
    await expect(assertAvatarMaterials(doc, 'av-1', { stage: 'pre' })).rejects.toThrow(/no base colour texture/);
  });

  it('rejects a non-white factor and metallic above 0 in the post stage only', async () => {
    const doc = await build([{ ...good('a'), factor: [1, 1, 0, 0.5] }, { ...good('b'), metallic: 0.4 }]);
    expect((await avatarMaterialProblems(doc, { stage: 'post' })).length).toBe(2);
    expect(await avatarMaterialProblems(doc, { stage: 'pre' })).toEqual([]);
  });

  it('accepts a declared exception', async () => {
    const doc = await build([{ name: 'eyes', texture: 'none' }]);
    expect(await avatarMaterialProblems(doc, { exceptions: ['eyes'] })).toEqual([]);
  });

  it('normalises factors, metallic and alpha mode (MASK only on *_opacity)', async () => {
    const doc = await build([
      { name: 'x_body', texture: 'real', factor: [1, 1, 0, 0.5], metallic: 0.4 },
      { name: 'x_opacity', texture: 'real', factor: [1, 1, 0, 0.5], metallic: 0.4 },
    ]);
    normalizeAvatarMaterials(doc);
    const [body, opacity] = doc.getRoot().listMaterials();
    expect(body.getAlphaMode()).toBe('OPAQUE');
    expect(opacity.getAlphaMode()).toBe('MASK');
    expect(opacity.getAlphaCutoff()).toBe(0.5);
    expect(await avatarMaterialProblems(doc)).toEqual([]);
  });

  it('property: guard accepts a material set iff Property 1 holds', async () => {
    const spec = fc.record({
      suffix: fc.constantFrom('body', 'head', 'opacity'),
      texture: fc.constantFrom('real', 'placeholder', 'none'),
      white: fc.boolean(),
      metallic: fc.constantFrom(0, 0.4),
      mask: fc.boolean(),
    });
    await fc.assert(
      fc.asyncProperty(fc.array(spec, { minLength: 1, maxLength: 4 }), async (list) => {
        const specs = list.map((s, i) => ({
          name: `m${i}_${s.suffix}`,
          texture: s.texture,
          factor: s.white ? [1, 1, 1, 1] : [1, 1, 0, 0.5],
          metallic: s.metallic,
          mode: s.mask ? 'MASK' : 'OPAQUE',
        }));
        const expected = specs.every(
          (s) =>
            s.texture === 'real' &&
            s.factor[2] === 1 &&
            s.metallic === 0 &&
            (s.mode === 'MASK') === s.name.endsWith('_opacity'),
        );
        const doc = await build(specs);
        const ok = (await avatarMaterialProblems(doc)).length === 0;
        expect(ok).toBe(expected);
        expect(doc.getRoot().listMaterials().every((m) => isOpacityMaterial(m) === m.getName().endsWith('_opacity'))).toBe(true);
      }),
      { numRuns: 40 },
    );
  });
});
