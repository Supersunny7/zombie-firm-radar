import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  CrackedHeadstoneImpossible,
  crackHeightMap,
  isCracked,
  MAP_SIZE,
  makeCrackedHeadstone,
  parseArgs,
} from './make-cracked-headstone.mjs';
import { countTriangles } from './asset-lib/edits/decimate.mjs';

const N = 6; // grid cells per face

/** Tiny box-like headstone: 6 faces with their own vertices (UV seams), UVs, optional 64x64 normal map. */
async function buildStone({ uvs = true, normalMap = true } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = [], uv = [], idx = [];
  const W = 1, H = 1.5, D = 0.2;
  const faces = [
    { o: [-W / 2, 0, D / 2], u: [W, 0, 0], v: [0, H, 0] },
    { o: [W / 2, 0, -D / 2], u: [-W, 0, 0], v: [0, H, 0] },
    { o: [-W / 2, 0, -D / 2], u: [0, 0, D], v: [0, H, 0] },
    { o: [W / 2, 0, D / 2], u: [0, 0, -D], v: [0, H, 0] },
    { o: [-W / 2, H, D / 2], u: [W, 0, 0], v: [0, 0, -D] },
    { o: [-W / 2, 0, -D / 2], u: [W, 0, 0], v: [0, 0, D] },
  ];
  for (const f of faces) {
    const base = pos.length / 3;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const s = i / N, t = j / N;
        pos.push(f.o[0] + f.u[0] * s + f.v[0] * t, f.o[1] + f.u[1] * s + f.v[1] * t, f.o[2] + f.u[2] * s + f.v[2] * t);
        uv.push(s, 1 - t);
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer));
  if (uvs) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
  const mat = doc.createMaterial('stone');
  if (normalMap) {
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 128, g: 128, b: 255 } } }).png().toBuffer();
    mat.setNormalTexture(doc.createTexture('n').setImage(new Uint8Array(png)).setMimeType('image/png'));
  }
  prim.setMaterial(mat);
  const mesh = doc.createMesh('stone').addPrimitive(prim);
  const scene = doc.createScene().addChild(doc.createNode('stone').setMesh(mesh));
  doc.getRoot().setDefaultScene(scene);
  return doc;
}

const sha = async (doc) => createHash('sha256').update(await new NodeIO().writeBinary(doc)).digest('hex');
const positions = (doc) => doc.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION');

function heightOf(doc) {
  const acc = positions(doc);
  let lo = Infinity, hi = -Infinity;
  const v = [0, 0, 0];
  for (let i = 0; i < acc.getCount(); i++) {
    acc.getElement(i, v);
    lo = Math.min(lo, v[1]);
    hi = Math.max(hi, v[1]);
  }
  return hi - lo;
}

describe('makeCrackedHeadstone', () => {
  it('adds a 1024 normal map, keeps the triangle count under the limit and marks the document', async () => {
    const doc = await buildStone();
    const before = heightOf(doc);
    await makeCrackedHeadstone(doc, { seed: 7 });
    const tex = doc.getRoot().listMaterials()[0].getNormalTexture();
    const meta = await sharp(Buffer.from(tex.getImage())).metadata();
    expect([meta.width, meta.height]).toEqual([MAP_SIZE, MAP_SIZE]);
    expect(countTriangles(doc)).toBeLessThanOrEqual(20000);
    expect(Math.abs(heightOf(doc) - before) / before).toBeLessThan(0.05);
    expect(isCracked(doc)).toBe(true);
    expect(doc.getRoot().getExtras().crackedHeadstone.seed).toBe(7);
  });

  it('creates a normal map when the material has none, and the crack changes pixels', async () => {
    const doc = await buildStone({ normalMap: false });
    await makeCrackedHeadstone(doc, { seed: 3 });
    const tex = doc.getRoot().listMaterials()[0].getNormalTexture();
    expect(tex).not.toBeNull();
    const { data } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
    const flat = [...new Set(Array.from({ length: data.length / 3 }, (_, i) => data[i * 3 + 2]))];
    expect(flat.length).toBeGreaterThan(1);
  });

  it('chips at least one vertex', async () => {
    const a = await buildStone();
    const b = await buildStone();
    await makeCrackedHeadstone(b, { seed: 11 });
    expect(Array.from(positions(b).getArray())).not.toEqual(Array.from(positions(a).getArray()));
  });

  it('is deterministic and the seed matters', async () => {
    const [a, b, c] = [await buildStone(), await buildStone(), await buildStone()];
    await makeCrackedHeadstone(a, { seed: 5 });
    await makeCrackedHeadstone(b, { seed: 5 });
    await makeCrackedHeadstone(c, { seed: 6 });
    expect(await sha(a)).toBe(await sha(b));
    expect(await sha(a)).not.toBe(await sha(c));
  });

  it('keeps vertices that shared a position (UV seams) together', async () => {
    const doc = await buildStone();
    const src = positions(doc).getArray().slice();
    await makeCrackedHeadstone(doc, { seed: 9 });
    const out = positions(doc).getArray();
    const groups = new Map();
    for (let i = 0; i < src.length / 3; i++) {
      const key = `${src[i * 3]},${src[i * 3 + 1]},${src[i * 3 + 2]}`;
      const moved = `${out[i * 3]},${out[i * 3 + 1]},${out[i * 3 + 2]}`;
      if (groups.has(key)) expect(moved).toBe(groups.get(key));
      else groups.set(key, moved);
    }
    expect([...groups.values()].length).toBeGreaterThan(0);
  });

  it('is a no-op on an already cracked document', async () => {
    const doc = await buildStone();
    await makeCrackedHeadstone(doc, { seed: 1 });
    const h = await sha(doc);
    await makeCrackedHeadstone(doc, { seed: 2 });
    expect(await sha(doc)).toBe(h);
  });

  it('refuses a model without UVs and rejects a bad seed', async () => {
    await expect(makeCrackedHeadstone(await buildStone({ uvs: false }), { seed: 1 })).rejects.toBeInstanceOf(CrackedHeadstoneImpossible);
    await expect(makeCrackedHeadstone(await buildStone(), { seed: 1.5 })).rejects.toBeInstanceOf(RangeError);
  });

  it('crack map is seeded and leaves most of the face blank', () => {
    const a = crackHeightMap(1), b = crackHeightMap(1);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
    const cracked = a.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    expect(cracked).toBeGreaterThan(0);
    expect(cracked / a.length).toBeLessThan(0.2);
  });

  it('parses CLI arguments', () => {
    expect(parseArgs(['--in', 'a.zip', '--out', 'b.glb', '--seed', '4'])).toMatchObject({ in: 'a.zip', out: 'b.glb', seed: 4 });
    expect(() => parseArgs(['--x'])).toThrow();
  });
});
