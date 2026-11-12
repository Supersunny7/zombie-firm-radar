// Bug condition exploration for avatar-textures-missing-fix (Property 1).
// Encodes the EXPECTED behaviour: every avatar material carries a real base colour texture,
// white opaque factors, metallic 0, MASK only on the *_opacity material, WebP textures <= 1024 px.
// On unfixed code these tests FAIL; that failure confirms the bug.
// Validates: Requirements 1.1, 1.2, 1.3, 1.5, 2.5
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { convertModel } from './convert-model.mjs';
import { stageFbxTextures } from './fbx-textures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(here, '..');
const avatarsDir = path.resolve(toolsDir, '..', 'web', 'public', 'assets', 'avatars');
const downloadsDir = path.join(toolsDir, 'cache', 'downloads');

const AVATAR_IDS = [
  'rocketbox-business-female-01',
  'rocketbox-business-male-02',
  'rocketbox-construction-female-01',
  'rocketbox-construction-male-01',
  'rocketbox-gardener-male-01',
  'rocketbox-male-adult-05',
  'rocketbox-medical-female-01',
];
const PLACEHOLDER = [255, 255, 0, 127];
const WHITE = [1, 1, 1, 1];
const LIMIT = 1024;

async function readIO() {
  await MeshoptDecoder.ready;
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
}

const sameArray = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);

/** Violations of Property 1 for a document; an empty list means the avatar is correct. */
async function materialViolations(doc) {
  const out = [];
  for (const m of doc.getRoot().listMaterials()) {
    const name = m.getName();
    const tex = m.getBaseColorTexture();
    const factor = m.getBaseColorFactor();
    if (!tex) {
      out.push(`${name}: no baseColorTexture`);
    } else {
      const mime = tex.getMimeType();
      if (mime !== 'image/webp') out.push(`${name}: texture mime ${mime}`);
      const bytes = tex.getImage();
      const meta = await sharp(Buffer.from(bytes)).metadata();
      if (meta.width > LIMIT || meta.height > LIMIT) out.push(`${name}: texture ${meta.width}x${meta.height} > ${LIMIT}`);
      if (meta.width === 1 && meta.height === 1) {
        const px = [...(await sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer())];
        if (sameArray(px, PLACEHOLDER)) out.push(`${name}: baseColorTexture is the 1x1 placeholder`);
      }
    }
    if (!sameArray(factor, WHITE)) out.push(`${name}: baseColorFactor [${factor.map((v) => +v.toFixed(3))}]`);
    if (m.getMetallicFactor() !== 0) out.push(`${name}: metallicFactor ${m.getMetallicFactor()}`);
    const isOpacity = /_opacity$/i.test(name);
    const mode = m.getAlphaMode();
    if (isOpacity && mode !== 'MASK') out.push(`${name}: alphaMode ${mode}, expected MASK`);
    if (!isOpacity && mode === 'MASK') out.push(`${name}: alphaMode MASK on a non-opacity material`);
  }
  return out;
}

describe('committed avatar .glb files carry their textures (Property 1)', () => {
  for (const id of AVATAR_IDS) {
    it(`${id}: every material has a real base colour texture and neutral factors`, async () => {
      const file = path.join(avatarsDir, id, `${id}.glb`);
      expect(existsSync(file), `${file} exists`).toBe(true);
      const doc = await (await readIO()).read(file);
      expect(doc.getRoot().listMaterials().length).toBeGreaterThan(0);
      expect(await materialViolations(doc)).toEqual([]);
    });
  }
});

const cachedSource = path.join(downloadsDir, 'rocketbox-business-female-01');
const haveCache = existsSync(downloadsDir) && readdirSync(downloadsDir).length > 0 && existsSync(cachedSource);
const tmpDirs = [];

describe('re-conversion of cached Rocketbox FBX with staged PNGs', () => {
  it.skipIf(!haveCache)('convertModel output for rocketbox-business-female-01 satisfies Property 1', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'avatar-tex-'));
    tmpDirs.push(root);
    // Stage exactly like resolveModelInput: decoded PNGs plus a patched FBX copy.
    const stage = path.join(root, 'src');
    const textureFiles = (await readdir(path.join(cachedSource, 'Textures'))).map((t) => ({
      name: `Textures/${t}`,
      path: path.join(cachedSource, 'Textures', t),
    }));
    const staged = await stageFbxTextures({
      avatarId: 'rocketbox-business-female-01',
      fbxPath: path.join(cachedSource, 'Business_Female_01.fbx'),
      textureFiles,
      stageDir: stage,
    });
    const pick = {
      id: 'rocketbox-business-female-01',
      kind: 'avatar',
      edits: [],
      credits: { title: 'Rocketbox Business_Female_01', author: 'Microsoft (Rocketbox)', sourceUrl: 'https://github.com/microsoft/Microsoft-Rocketbox' },
    };
    const out = path.join(root, 'out');
    const result = await convertModel(
      pick,
      { path: staged.fbxPath, licensePath: path.join(cachedSource, 'LICENSE') },
      out,
    );
    const glb = result.files.find((f) => f.kind === 'model');
    const doc = await (await readIO()).read(glb.path);
    expect(await materialViolations(doc)).toEqual([]);
  }, 120000);
});

describe('placeholder guard', () => {
  it('rejects an avatar whose base colour texture is the 1x1 [255, 255, 0, 127] placeholder', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'avatar-guard-'));
    tmpDirs.push(root);
    const png = await sharp(Buffer.from(PLACEHOLDER), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
    const doc = new Document();
    const buffer = doc.createBuffer();
    const tex = doc.createTexture('placeholder').setImage(new Uint8Array(png)).setMimeType('image/png');
    const mat = doc.createMaterial('f014_body').setBaseColorTexture(tex);
    const pos = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
      .setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute('POSITION', pos).setMaterial(mat);
    const node = doc.createNode('mesh').setMesh(doc.createMesh('m').addPrimitive(prim));
    doc.createScene('s').addChild(node);
    const src = path.join(root, 'placeholder.glb');
    await (await readIO()).write(src, doc);

    const pick = { id: 'synthetic-avatar', kind: 'avatar', edits: [], credits: { title: 'synthetic', author: 'test', sourceUrl: 'https://example.invalid' } };
    await expect(convertModel(pick, { path: src }, path.join(root, 'out'))).rejects.toThrow(/synthetic-avatar/);
    // MeshoptEncoder is imported so the encoder is initialised in the same way as the pipeline.
    expect(MeshoptEncoder).toBeDefined();
  });
});

afterAll(async () => {
  await Promise.all(tmpDirs.map((d) => rm(d, { recursive: true, force: true })));
});
