// Fixture tests for convert-model.mjs: tiny glTF documents built in code (no downloads, no FBX files).
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertModel, readExtensionsUsed } from './convert-model.mjs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
let dir;

/** Grid plane with n x n quads (2 n^2 triangles), a PNG texture, optional skin with joint names. */
async function buildDoc({ n = 8, joints = null, texture = true } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = [];
  const uv = [];
  for (let y = 0; y <= n; y++) {
    for (let x = 0; x <= n; x++) {
      pos.push(x / n, y / n, 0);
      uv.push(x / n, y / n);
    }
  }
  const idx = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = y * (n + 1) + x;
      idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1);
    }
  }
  const count = (n + 1) * (n + 1);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer));
  const mat = doc.createMaterial('m');
  if (texture) {
    // Not a solid colour: prune() would otherwise replace the texture with a material factor.
    const raw = Buffer.alloc(16 * 16 * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 37) % 256;
    const png = await sharp(raw, { raw: { width: 16, height: 16, channels: 3 } }).png().toBuffer();
    mat.setBaseColorTexture(doc.createTexture('t').setImage(new Uint8Array(png)).setMimeType('image/png'));
  }
  prim.setMaterial(mat);
  const mesh = doc.createMesh('mesh').addPrimitive(prim);
  const node = doc.createNode('body').setMesh(mesh);
  const scene = doc.createScene('s').addChild(node);
  if (joints) {
    prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint16Array(count * 4)).setBuffer(buffer));
    const w = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) w[i * 4] = 1;
    prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(w).setBuffer(buffer));
    const skin = doc.createSkin('skin');
    const ibm = new Float32Array(joints.length * 16);
    for (let i = 0; i < joints.length; i++) ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * 16);
    skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buffer));
    for (const name of joints) {
      const j = doc.createNode(name);
      scene.addChild(j);
      skin.addJoint(j);
    }
    node.setSkin(skin);
  }
  return doc;
}

async function writeSource(name, opts) {
  const p = path.join(dir, name);
  await io.write(p, await buildDoc(opts));
  return p;
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'convert-model-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('convertModel', () => {
  it('writes one GLB with EXT_meshopt_compression and WebP texture, deterministically', async () => {
    const src = await writeSource('prop.glb');
    const pick = { id: 'prop', kind: 'model', edits: [] };
    const a = await convertModel(pick, { path: src }, path.join(dir, 'out-a'));
    const b = await convertModel(pick, { path: src }, path.join(dir, 'out-b'));
    expect(a.files).toHaveLength(1);
    expect(a.files[0].fileName).toBe('prop.glb');
    const used = await readExtensionsUsed(a.files[0].path);
    expect(used).toContain('EXT_meshopt_compression');
    expect(used).toContain('EXT_texture_webp');
    const back = await io.read(a.files[0].path);
    expect(back.getRoot().listMeshes()).toHaveLength(1);
    expect(Buffer.compare(await readFile(a.files[0].path), await readFile(b.files[0].path))).toBe(0);
  });

  it('leaves exactly one binary GLB in the output folder (no .bin or texture files beside it)', async () => {
    const src = await writeSource('single.glb');
    const outDir = path.join(dir, 'out-single');
    await convertModel({ id: 'single', kind: 'model', edits: [] }, { path: src }, outDir);
    expect(await readdir(outDir)).toEqual(['single.glb']);
    expect((await readFile(path.join(outDir, 'single.glb'))).subarray(0, 4).toString('latin1')).toBe('glTF');
  });

  it('runs the pick Edit_List and fails strictly on a missing target', async () => {
    const src = await writeSource('edit.glb');
    const ok = await convertModel({ id: 'edit', kind: 'model', edits: [{ op: 'removeNode', node: 'body' }] }, { path: src }, path.join(dir, 'out-e1'));
    const back = await io.read(ok.files[0].path);
    expect(back.getRoot().listMeshes()).toHaveLength(0);
    await expect(
      convertModel({ id: 'edit', kind: 'model', edits: [{ op: 'removeNode', node: 'nope' }] }, { path: src }, path.join(dir, 'out-e2')),
    ).rejects.toThrow();
  });

  it('copies the Rocketbox LICENSE beside an avatar with Bip01 joints', async () => {
    const src = await writeSource('avatar.glb', { joints: ['Bip01', 'Bip01 Pelvis', 'Bip01_Head'] });
    const lic = path.join(dir, 'RB-LICENSE');
    await writeFile(lic, 'MIT License\n');
    const pick = { id: 'avatar-a', kind: 'avatar', credits: { title: 'Rocketbox avatar', author: 'Microsoft Rocketbox', sourceUrl: 'https://github.com/microsoft/Microsoft-Rocketbox' } };
    const r = await convertModel(pick, { path: src, licensePath: lic }, path.join(dir, 'out-av'));
    expect(r.bip01).toBe(true);
    expect(r.files.map((f) => f.fileName)).toEqual(['avatar-a.glb', 'LICENSE']);
    expect(r.files[1].title).toBe('Microsoft Rocketbox LICENSE');
    expect(await readFile(r.files[1].path, 'utf8')).toBe('MIT License\n');
  });

  it('rejects a non-Bip01 Rocketbox skeleton and leaves no output', async () => {
    const src = await writeSource('bad.glb', { joints: ['Bip01', 'mixamorig:Hips'] });
    const lic = path.join(dir, 'RB-LICENSE');
    const out = path.join(dir, 'out-bad');
    const pick = { id: 'bad', kind: 'avatar', credits: { title: 'Rocketbox', author: 'x', sourceUrl: 'u' } };
    await expect(convertModel(pick, { path: src, licensePath: lic }, out)).rejects.toThrow(/Bip01/);
    const { readdir } = await import('node:fs/promises');
    expect(await readdir(out)).toEqual([]);
  });

  it('routes .fbx through the injected fbx2gltf step (stub, no executable)', async () => {
    const glb = await writeSource('fromfbx.glb');
    const fbx = path.join(dir, 'fake.fbx');
    await writeFile(fbx, 'not a real fbx');
    let called = null;
    const convertFbx = async (s, d, args) => {
      called = { s, d, args };
      await writeFile(d, await readFile(glb));
      return d;
    };
    const r = await convertModel({ id: 'fbxprop', kind: 'model' }, { path: fbx }, path.join(dir, 'out-fbx'), { convertFbx });
    expect(called.s).toBe(fbx);
    expect(called.args).toContain('--binary');
    expect(r.files[0].fileName).toBe('fbxprop.glb');
  });
});
