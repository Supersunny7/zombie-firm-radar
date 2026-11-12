// FBX2glTF cannot load TGA and silently writes 1x1 placeholders. Stage PNG copies of the
// referenced TGAs and a same-length patched copy of the FBX that points at them.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeTga, tgaToPng } from './tga.mjs';

export class AvatarTextureError extends Error {
  constructor(avatarId, texture, message) {
    super(`${avatarId}: texture "${texture}" ${message}`);
    this.name = 'AvatarTextureError';
    this.avatarId = avatarId;
    this.texture = texture;
  }
}

// A ".tga" extension that ends a path string (preceded by a name character, not followed by one).
const TGA_REF = /([^\\/\x00-\x1f"<>|:*?]*[\w\-)])\.tga(?![A-Za-z0-9_])/gi;
const TGA_EXT = /(?<=[\w\-)])\.tga(?![A-Za-z0-9_])/gi;

/** Base names (no extension, as written in the FBX) of every referenced TGA, de-duplicated. */
export function referencedTgaNames(fbx) {
  const text = Buffer.from(fbx).toString('latin1');
  const seen = new Map();
  for (const m of text.matchAll(TGA_REF)) {
    const name = m[1];
    if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()];
}

/** Same-length rewrite: ".tga" -> ".png" inside path strings. Other bytes are untouched. */
export function rewriteTgaRefs(fbx) {
  const text = Buffer.from(fbx).toString('latin1').replace(TGA_EXT, (m) => (m === m.toUpperCase() ? '.PNG' : '.png'));
  return Buffer.from(text, 'latin1');
}

/**
 * @param {{ avatarId: string, fbxPath: string, textureFiles: {name: string, path: string}[], stageDir: string }} args
 * @returns {Promise<{ fbxPath: string, pngs: string[] }>}
 */
export async function stageFbxTextures({ avatarId, fbxPath, textureFiles, stageDir }) {
  const source = await readFile(fbxPath);
  const byName = new Map();
  for (const t of textureFiles) {
    const base = path.basename(t.name).toLowerCase();
    if (base.endsWith('.tga')) byName.set(base.slice(0, -4), t);
  }

  const refs = referencedTgaNames(source);
  for (const ref of refs) {
    if (!byName.has(ref.toLowerCase())) {
      throw new AvatarTextureError(avatarId, `${ref}.tga`, 'is referenced by the FBX but missing from the download');
    }
  }

  await mkdir(stageDir, { recursive: true });
  const pngs = [];
  for (const ref of refs) {
    const file = byName.get(ref.toLowerCase());
    const out = path.join(stageDir, `${ref}.png`);
    try {
      const png = await tgaToPng(decodeTga(await readFile(file.path)));
      await writeFile(out, png);
    } catch (err) {
      throw new AvatarTextureError(avatarId, `${ref}.tga`, `could not be converted: ${err.message}`);
    }
    pngs.push(out);
  }

  const staged = path.join(stageDir, `${avatarId}.fbx`);
  await writeFile(staged, rewriteTgaRefs(source));
  return { fbxPath: staged, pngs };
}
