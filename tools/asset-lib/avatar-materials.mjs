// Avatar material guards and normalisation (avatar-textures-missing-fix, Property 1).
// Pre guard: right after FBX2glTF, every material needs a real (not 1x1 placeholder) base colour texture.
// Post guard: the final document must satisfy the full expected behaviour before it is written.
import sharp from 'sharp';
import { LIMIT_DEFAULT } from './convert-texture.mjs';
import { AvatarTextureError } from './fbx-textures.mjs';

export const WHITE = [1, 1, 1, 1];
export const OPACITY_SUFFIX = /_opacity$/i;

const sameArray = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);

/** True for the material that carries the alpha mask (eyelashes and hair cards). Pure. */
export function isOpacityMaterial(material) {
  return OPACITY_SUFFIX.test(material.getName());
}

function describeTexture(material, tex) {
  return tex?.getName() || tex?.getURI() || `${material.getName()} baseColorTexture`;
}

/**
 * Problems found in the materials of `doc`. `stage` is 'pre' (textures only) or 'post' (everything).
 * Returns [{ material, texture, message }]. Materials listed in `exceptions` skip the texture checks.
 */
export async function avatarMaterialProblems(doc, { stage = 'post', exceptions = [] } = {}) {
  const problems = [];
  for (const m of doc.getRoot().listMaterials()) {
    const name = m.getName();
    const tex = m.getBaseColorTexture();
    const excepted = exceptions.includes(name);
    if (!tex) {
      if (!excepted) problems.push({ material: name, texture: 'baseColorTexture', message: 'has no base colour texture' });
    } else {
      const label = describeTexture(m, tex);
      let meta = null;
      try {
        meta = await sharp(Buffer.from(tex.getImage())).metadata();
      } catch {
        problems.push({ material: name, texture: label, message: 'base colour texture cannot be decoded' });
      }
      if (meta) {
        if (meta.width === 1 && meta.height === 1) {
          problems.push({ material: name, texture: label, message: 'base colour texture is a 1x1 placeholder' });
        }
        if (stage === 'post') {
          if (tex.getMimeType() !== 'image/webp') {
            problems.push({ material: name, texture: label, message: `texture is ${tex.getMimeType()}, expected image/webp` });
          }
          if (meta.width > LIMIT_DEFAULT || meta.height > LIMIT_DEFAULT) {
            problems.push({ material: name, texture: label, message: `texture is ${meta.width}x${meta.height}, over ${LIMIT_DEFAULT}` });
          }
        }
      }
    }
    if (stage === 'post') {
      const label = 'material';
      if (!sameArray(m.getBaseColorFactor(), WHITE)) {
        problems.push({ material: name, texture: label, message: `baseColorFactor is [${m.getBaseColorFactor()}], expected [1,1,1,1]` });
      }
      if (m.getMetallicFactor() !== 0) {
        problems.push({ material: name, texture: label, message: `metallicFactor is ${m.getMetallicFactor()}, expected 0` });
      }
      const mode = m.getAlphaMode();
      if (isOpacityMaterial(m) && mode !== 'MASK') {
        problems.push({ material: name, texture: label, message: `alphaMode is ${mode}, expected MASK` });
      }
      if (!isOpacityMaterial(m) && mode === 'MASK') {
        problems.push({ material: name, texture: label, message: 'alphaMode MASK on a non-opacity material' });
      }
    }
  }
  return problems;
}

/** Throws AvatarTextureError naming the avatar, material and texture for the first problem. */
export async function assertAvatarMaterials(doc, avatarId, options = {}) {
  const [first] = await avatarMaterialProblems(doc, options);
  if (first) throw new AvatarTextureError(avatarId, first.texture, `(material ${first.material}) ${first.message}`);
}

/** White opaque non-metallic factors; MASK (cutoff 0.5) on `*_opacity` only, OPAQUE elsewhere. */
export function normalizeAvatarMaterials(doc) {
  for (const m of doc.getRoot().listMaterials()) {
    m.setBaseColorFactor([...WHITE]).setMetallicFactor(0);
    if (isOpacityMaterial(m)) m.setAlphaMode('MASK').setAlphaCutoff(0.5);
    else m.setAlphaMode('OPAQUE');
  }
}
