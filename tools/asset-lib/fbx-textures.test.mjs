import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { AvatarTextureError, referencedTgaNames, rewriteTgaRefs, stageFbxTextures } from './fbx-textures.mjs';
import { buildTga } from './test-helpers/tga-builder.mjs';

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'fbxtex-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const fbxBytes = () =>
  Buffer.concat([
    Buffer.from('Kaydara FBX Binary\0\x1a\0', 'latin1'),
    Buffer.from('D:\\temp\\f014\\textures\\f014_body_color.tga', 'latin1'),
    Buffer.from([0, 7, 255, 128]),
    Buffer.from('textures\\f014_body_color.tga', 'latin1'),
    Buffer.from([0, 1]),
    Buffer.from('textures\\f014_body_normal.TGA', 'latin1'),
  ]);

async function setup(names, size = 4) {
  const fbxPath = path.join(dir, 'model.fbx');
  await writeFile(fbxPath, fbxBytes());
  const textureFiles = [];
  for (const n of names) {
    const p = path.join(dir, `${n}.tga`);
    const pixels = Array.from({ length: size * size }, (_, i) => [i % 256, 10, 20]);
    await writeFile(p, buildTga({ width: size, height: size, bpp: 24, pixels }));
    textureFiles.push({ name: `Textures/${n}.tga`, path: p });
  }
  return { fbxPath, textureFiles };
}

describe('stageFbxTextures', () => {
  it('finds each referenced base name once', () => {
    expect(referencedTgaNames(fbxBytes())).toEqual(['f014_body_color', 'f014_body_normal']);
  });

  it('rewrites .tga to .png with identical length', async () => {
    const { fbxPath, textureFiles } = await setup(['f014_body_color', 'f014_body_normal', 'unused']);
    const res = await stageFbxTextures({ avatarId: 'av', fbxPath, textureFiles, stageDir: path.join(dir, 'stage') });
    const src = await readFile(fbxPath);
    const out = await readFile(res.fbxPath);
    expect(out.length).toBe(src.length);
    expect(out.toString('latin1')).not.toMatch(/\.tga/i);
    expect(out.toString('latin1')).toContain('f014_body_color.png');
    expect(path.basename(res.fbxPath)).toBe('av.fbx');
  });

  it('writes PNGs of at most 1024 px, only for referenced files', async () => {
    const { fbxPath, textureFiles } = await setup(['f014_body_color', 'f014_body_normal', 'unused']);
    const res = await stageFbxTextures({ avatarId: 'av', fbxPath, textureFiles, stageDir: path.join(dir, 'stage') });
    expect(res.pngs.map((p) => path.basename(p)).sort()).toEqual(['f014_body_color.png', 'f014_body_normal.png']);
    for (const p of res.pngs) {
      const m = await sharp(p).metadata();
      expect(Math.max(m.width, m.height)).toBeLessThanOrEqual(1024);
    }
  });

  it('downsizes textures above 1024 px', async () => {
    const { fbxPath, textureFiles } = await setup(['f014_body_color', 'f014_body_normal'], 2048);
    const res = await stageFbxTextures({ avatarId: 'av', fbxPath, textureFiles, stageDir: path.join(dir, 'stage') });
    const m = await sharp(res.pngs[0]).metadata();
    expect(m.width).toBe(1024);
  });

  it('names avatar and texture when a referenced file is missing', async () => {
    const { fbxPath, textureFiles } = await setup(['f014_body_color']);
    const err = await stageFbxTextures({ avatarId: 'rocketbox-x', fbxPath, textureFiles, stageDir: path.join(dir, 's') }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(AvatarTextureError);
    expect(err.message).toContain('rocketbox-x');
    expect(err.message).toContain('f014_body_normal');
  });

  it('leaves the source FBX bytes untouched', async () => {
    const { fbxPath, textureFiles } = await setup(['f014_body_color', 'f014_body_normal']);
    const before = await readFile(fbxPath);
    await stageFbxTextures({ avatarId: 'av', fbxPath, textureFiles, stageDir: path.join(dir, 'stage') });
    expect(Buffer.compare(await readFile(fbxPath), before)).toBe(0);
  });

  it('rewriteTgaRefs ignores a bare ".tga" without a name', () => {
    const b = Buffer.from('a b .tga x', 'latin1');
    expect(rewriteTgaRefs(b).toString('latin1')).toBe('a b .tga x');
  });
});
