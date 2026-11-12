// Preservation tests for the avatar-textures-missing-fix bugfix (Property 2).
// Observed on the UNFIXED code; they must pass before and after the fix.
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fc from 'fast-check';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { collectJointNames } from './bip01.mjs';
import { convertModel } from './convert-model.mjs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const AVATARS_DIR = path.resolve(import.meta.dirname, '../../web/public/assets/avatars');
const sha = (x) => createHash('sha256').update(x).digest('hex');
const sha16 = (x) => sha(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).slice(0, 16);

let dir;
let licensePath;
beforeAll(async () => {
  await MeshoptDecoder.ready;
  dir = await mkdtemp(path.join(os.tmpdir(), 'avatar-preservation-'));
  licensePath = path.join(dir, 'RB-LICENSE');
  await writeFile(licensePath, 'MIT License\n');
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- fixtures

/** Grid plane, deterministic non-solid PNG texture, optional Bip01 skin / animation. */
async function buildDoc({ n = 4, texture = true, joints = null, animate = false } = {}) {
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
    const raw = Buffer.alloc(16 * 16 * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 37) % 256;
    const png = await sharp(raw, { raw: { width: 16, height: 16, channels: 3 } }).png().toBuffer();
    mat.setBaseColorTexture(doc.createTexture('t').setImage(new Uint8Array(png)).setMimeType('image/png'));
  }
  prim.setMaterial(mat);
  const node = doc.createNode('body').setMesh(doc.createMesh('mesh').addPrimitive(prim));
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
  if (animate) {
    const bip = doc.createNode('Bip01');
    scene.addChild(bip);
    const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array([0, 0.5, 1])).setBuffer(buffer);
    const output = doc.createAccessor().setType('VEC3').setArray(new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0])).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel().setTargetNode(bip).setTargetPath('translation').setSampler(sampler);
    doc.createAnimation('walk').addSampler(sampler).addChannel(channel);
  }
  return doc;
}

let counter = 0;
async function writeSource(opts) {
  const p = path.join(dir, `src-${counter++}.glb`);
  await io.write(p, await buildDoc(opts));
  return p;
}

const ROCKETBOX = { title: 'Rocketbox', author: 'Microsoft Rocketbox', sourceUrl: 'https://github.com/microsoft/Microsoft-Rocketbox' };

async function convertBytes(pick, srcOpts, extraInput = {}) {
  const src = await writeSource(srcOpts);
  const out = path.join(dir, `out-${counter++}`);
  const r = await convertModel(pick, { path: src, ...extraInput }, out);
  return { r, bytes: await readFile(r.files[0].path), out };
}

// ------------------------------------------------------- baseline (unfixed)

// SHA-256 of convertModel output, observed on unfixed code for deterministic fixtures.
const MODEL_BASELINE = {
  'model|n=2|tex=true': 'a4eed7e4bf846eb1952cc07ce86ccf6b36a127be29cadc20995821a85b5e8001',
  'model|n=2|tex=false': '8572683990e923d29b7b71981999fec237a6815be45768f96b8aea92ec93461d',
  'model|n=4|tex=true': 'bc33b84472068c88b2daf53e29aae9bbb1ecb1b84815fcd72709f1e9e1cfda39',
  'model|n=4|tex=false': '4bc30fc13b0068225a3c923e60540b8abeb65a1dde5d7480e89833e4134fa74e',
  'model|n=8|tex=true': '44882a1f49b0a368450952c0d6326307a1957ab06b4662e028742ee85a22507a',
  'model|n=8|tex=false': 'dce6be7cbc42df585de1874f8557d13586b9fc5986ae49d4e9b7825dba73de79',
  'animation|n=2|tex=true': 'a4eed7e4bf846eb1952cc07ce86ccf6b36a127be29cadc20995821a85b5e8001',
  'animation|n=2|tex=false': '8572683990e923d29b7b71981999fec237a6815be45768f96b8aea92ec93461d',
  'animation|n=4|tex=true': 'bc33b84472068c88b2daf53e29aae9bbb1ecb1b84815fcd72709f1e9e1cfda39',
  'animation|n=4|tex=false': '4bc30fc13b0068225a3c923e60540b8abeb65a1dde5d7480e89833e4134fa74e',
  'animation|n=8|tex=true': '44882a1f49b0a368450952c0d6326307a1957ab06b4662e028742ee85a22507a',
  'animation|n=8|tex=false': 'dce6be7cbc42df585de1874f8557d13586b9fc5986ae49d4e9b7825dba73de79',
};
const ANIM_BASELINE = 'fcd6b1947d463b76be77b2e8fc66ef67235167bb09bd5ea076ad014c4d14fe1b';

// Observed on the 8 committed avatars (unfixed).
const LICENSE_SHA16 = '17474e386e0b9e1a';
const AVATAR_BASELINE = {
  'rocketbox-business-female-01': { meshes: 1, prims: 3, joints: 80, jointsSha: '4ab27310a391af11', nodes: 83, nodesSha: '14d26d294068507a' },
  'rocketbox-business-male-02': { meshes: 1, prims: 3, joints: 80, jointsSha: 'd234fba0ee92446c', nodes: 83, nodesSha: '11c8de6d844dd7c9' },
  'rocketbox-construction-female-01': { meshes: 1, prims: 3, joints: 80, jointsSha: '65eaf09dd6b81c2a', nodes: 83, nodesSha: 'de436ed80deb981b' },
  'rocketbox-construction-male-01': { meshes: 1, prims: 5, joints: 80, jointsSha: '7834323db6b79fc9', nodes: 83, nodesSha: 'a3e9ed4a3cca0232' },
  'rocketbox-female-adult-06': { meshes: 1, prims: 3, joints: 80, jointsSha: '94cbdee2b10dcbb4', nodes: 83, nodesSha: '5cf476cd8e8ae803' },
  'rocketbox-gardener-male-01': { meshes: 1, prims: 3, joints: 80, jointsSha: 'c69c30db6565bc5c', nodes: 83, nodesSha: '6085527aad00f502' },
  'rocketbox-male-adult-05': { meshes: 1, prims: 3, joints: 80, jointsSha: '70c709b899f6f755', nodes: 83, nodesSha: 'ce04ac18a2699424' },
  'rocketbox-medical-female-01': { meshes: 1, prims: 3, joints: 80, jointsSha: '980ecc52ab1f9e27', nodes: 83, nodesSha: '089485d69778b94f' },
};

// ------------------------------------------------------------------- tests

describe('non-avatar conversions keep their output bytes (3.1)', () => {
  it('model and animation picks match the observed SHA-256 for any option combination', async () => {
    const keys = Object.keys(MODEL_BASELINE);
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...keys), fc.integer({ min: 0, max: 1000 }), async (key, seed) => {
        const [kind, nPart, texPart] = key.split('|');
        const n = Number(nPart.slice(2));
        const texture = texPart === 'tex=true';
        const pick = { id: 'prop', kind, edits: [] };
        // seed is passed through options; with an empty Edit_List it must not change the bytes.
        const src = await writeSource({ n, texture });
        const out = path.join(dir, `out-${counter++}`);
        const r = await convertModel(pick, { path: src }, out, { seed });
        const bytes = await readFile(r.files[0].path);
        expect(r.files.map((f) => f.fileName)).toEqual(['prop.glb']);
        expect(await readdir(out)).toEqual(['prop.glb']);
        expect(sha(bytes)).toBe(MODEL_BASELINE[key]);
      }),
      { numRuns: 24 },
    );
  });

  it('a Rocketbox animation pick (Bip01, no textures) keeps its output bytes and gets no LICENSE', async () => {
    const pick = { id: 'm_walk_test', kind: 'animation', edits: [], credits: ROCKETBOX };
    const { r, bytes, out } = await convertBytes(pick, { texture: false, animate: true });
    expect(r.bip01).toBe(true);
    expect(await readdir(out)).toEqual(['m_walk_test.glb']);
    expect(sha(bytes)).toBe(ANIM_BASELINE);
  });
});

describe('avatar structure is preserved (3.3, 3.4)', () => {
  for (const [id, expected] of Object.entries(AVATAR_BASELINE)) {
    it(`${id}: files, LICENSE, skeleton, meshes and node names match the committed avatar`, async () => {
      expect((await readdir(path.join(AVATARS_DIR, id))).sort()).toEqual(['LICENSE', `${id}.glb`]);
      expect(sha16(await readFile(path.join(AVATARS_DIR, id, 'LICENSE')))).toBe(LICENSE_SHA16);
      const doc = await io.read(path.join(AVATARS_DIR, id, `${id}.glb`));
      const root = doc.getRoot();
      const joints = collectJointNames(doc);
      expect(joints.every((j) => /^Bip01([ _]|$)/.test(j))).toBe(true);
      expect({
        meshes: root.listMeshes().length,
        prims: root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0),
        joints: joints.length,
        jointsSha: sha16(joints),
        nodes: root.listNodes().length,
        nodesSha: sha16(root.listNodes().map((x) => x.getName())),
      }).toEqual(expected);
    });
  }
});

describe('avatar conversion from a .glb source (3.2, 3.3)', () => {
  it('keeps the Bip01 skeleton, mesh counts, node names, file names and LICENSE copy', async () => {
    const joints = ['Bip01', 'Bip01 Pelvis', 'Bip01_Head'];
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 8 }), fc.boolean(), async (n, texture) => {
        // The texture guard rejects untextured avatars; the textureless variant declares its material as an exception.
        const pick = { id: 'avatar-x', kind: 'avatar', edits: [], credits: ROCKETBOX, textureExceptions: texture ? [] : ['m'] };
        const { r, out } = await convertBytes(pick, { n, texture, joints }, { licensePath });
        expect(r.bip01).toBe(true);
        expect(r.files.map((f) => f.fileName)).toEqual(['avatar-x.glb', 'LICENSE']);
        expect((await readdir(out)).sort()).toEqual(['LICENSE', 'avatar-x.glb']);
        expect(await readFile(path.join(out, 'LICENSE'), 'utf8')).toBe('MIT License\n');
        const doc = await io.read(path.join(out, 'avatar-x.glb'));
        expect(collectJointNames(doc)).toEqual(joints);
        expect(doc.getRoot().listMeshes()).toHaveLength(1);
        expect(doc.getRoot().listMeshes()[0].listPrimitives()).toHaveLength(1);
        expect(doc.getRoot().listNodes().map((x) => x.getName()).sort()).toEqual(['Bip01', 'Bip01 Pelvis', 'Bip01_Head', 'body']);
      }),
      { numRuns: 8 },
    );
  });

  it('rejects a non-Bip01 skeleton and leaves no output', async () => {
    const pick = { id: 'bad', kind: 'avatar', edits: [], credits: ROCKETBOX };
    const src = await writeSource({ joints: ['Bip01', 'mixamorig:Hips'] });
    const out = path.join(dir, `out-${counter++}`);
    await expect(convertModel(pick, { path: src, licensePath }, out)).rejects.toThrow(/Bip01/);
    expect(await readdir(out)).toEqual([]);
  });
});

describe('transform order (3.2)', () => {
  /** Names of the transforms passed to Document.transform, in order. */
  async function transformNames(pick, srcOpts) {
    const spy = vi.spyOn(Document.prototype, 'transform');
    try {
      await convertBytes(pick, srcOpts, pick.kind === 'avatar' ? { licensePath } : {});
      // gltf-transform may call transform() again internally; the pipeline call has the most steps.
      const call = [...spy.mock.calls].sort((a, b) => b.length - a.length)[0];
      return call.map((fn) => fn.name);
    } finally {
      spy.mockRestore();
    }
  }

  it('avatar: dedup, prune, resample, textureCompress, meshopt (after the Edit_List)', async () => {
    const pick = { id: 'order-av', kind: 'avatar', edits: [], credits: ROCKETBOX };
    expect(await transformNames(pick, { joints: ['Bip01'] })).toEqual(['dedup', 'prune', 'resample', 'textureCompress', 'meshopt']);
  });

  it('animation: dedup, prune, resample, textureCompress, meshopt', async () => {
    const pick = { id: 'order-an', kind: 'animation', edits: [], credits: ROCKETBOX };
    expect(await transformNames(pick, { texture: false, animate: true })).toEqual(['dedup', 'prune', 'resample', 'textureCompress', 'meshopt']);
  });

  it('model: dedup, prune, textureCompress, meshopt (no resample)', async () => {
    const pick = { id: 'order-mo', kind: 'model', edits: [] };
    expect(await transformNames(pick, {})).toEqual(['dedup', 'prune', 'textureCompress', 'meshopt']);
  });

  it('runs the Edit_List before the transforms', async () => {
    const pick = { id: 'order-ed', kind: 'model', edits: [{ op: 'removeNode', node: 'body' }] };
    const { r } = await convertBytes(pick, {});
    const doc = await io.read(r.files[0].path);
    expect(doc.getRoot().listMeshes()).toHaveLength(0);
  });
});
