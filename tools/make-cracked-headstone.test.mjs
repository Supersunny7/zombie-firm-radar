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
import { ASSUMED_HEIGHT_M, fractureParams } from './asset-lib/fracture.mjs';
import { compareDocuments, XOR_THRESHOLD } from './preview/silhouette.mjs';
import { readModel } from './make-cracked-headstone.mjs';
import { existsSync } from 'node:fs';

const N = 6; // grid cells per face
const INTACT = new URL('../web/public/assets/models/sketchfab-small-gravestone-drydoctoregg/sketchfab-small-gravestone-drydoctoregg.glb', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

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
    expect(Math.abs(heightOf(doc) - before) / before).toBeLessThan(0.1); // chip <= 4 %, offset <= 4.4 %, tilt <= 1 %
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

  it('fractures the slab: closed mesh, offset 2 to 4 cm, recorded scale assumption, dark cut faces', async () => {
    const doc = await buildStone();
    const before = await buildStone();
    await makeCrackedHeadstone(doc, { seed: 21 });
    const info = doc.getRoot().getExtras().crackedHeadstone;
    expect(info.version).toBe(2);
    expect(doc.getRoot().getExtras().crackedBy).toBe('make-cracked-headstone@3');
    expect(info.assumedHeightM).toBe(ASSUMED_HEIGHT_M);
    expect(info.offsetCm).toBeGreaterThanOrEqual(2);
    expect(info.offsetCm).toBeLessThanOrEqual(4);
    // offset in model units = cm / 100 / 0.9 * height
    expect(info.offsetUnits).toBeCloseTo((info.offsetCm / 100 / 0.9) * info.heightUnits, 2);
    // more triangles than the box: the split and both caps exist
    expect(countTriangles(doc)).toBeGreaterThan(countTriangles(before));
    // every edge (by position) is shared by exactly two triangles: both pieces and all caps are closed
    const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
    const key = (i) => { const e = [0, 0, 0]; pos.getElement(i, e); return e.map((x) => Math.round(x * 1e4)).join(','); };
    const edges = new Map();
    for (let i = 0; i < idx.getCount(); i += 3) {
      const k = [key(idx.getScalar(i)), key(idx.getScalar(i + 1)), key(idx.getScalar(i + 2))];
      for (let j = 0; j < 3; j++) {
        const a = k[j], b = k[(j + 1) % 3];
        if (a === b) continue;
        const ek = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(ek, (edges.get(ek) ?? 0) + 1);
      }
    }
    // The top piece is moved, so its cap edges do not touch the bottom piece: every edge still has two triangles.
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
    // darker cut faces through vertex colour
    const col = prim.getAttribute('COLOR_0');
    let dark = 0;
    const c = [0, 0, 0, 1];
    for (let i = 0; i < col.getCount(); i++) { col.getElement(i, c); if (c[0] < 0.6) dark++; }
    expect(dark).toBeGreaterThan(0);
  });

  it('caps carry stone UVs (planar projection) and the dark tint only on a thin rim', async () => {
    const { capFan } = await import('./asset-lib/fracture.mjs');
    const v = (x, y, u, w) => { const o = new Float64Array(16); o[0] = x; o[1] = y; o[10] = u; o[11] = w; return o; };
    const ring = Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * 6.283), Math.sin((i / 16) * 6.283)]);
    const segs = ring.map((p, i) => { const q = ring[(i + 1) % 16]; return [v(p[0], p[1], 0.5, 0.5), v(q[0], q[1], 0.5, 0.5)]; });
    const tris = capFan(segs, [0, 0, 1], 0.3, 0.5);
    const verts = tris.flat();
    const uvs = new Set(verts.map((x) => `${x[10].toFixed(4)},${x[11].toFixed(4)}`));
    expect(uvs.size).toBeGreaterThan(16); // not one flat UV
    const dark = verts.filter((x) => x[12] < 0.5);
    expect(dark.length).toBeGreaterThan(0);
    for (const x of dark) expect(Math.hypot(x[0], x[1])).toBeGreaterThan(0.99);
    expect(verts.some((x) => x[12] === 1)).toBe(true);
  });
  it('places the fracture from the seed and the bounding box only; a notch on the face does not move it', async () => {
    const plain = await buildStone();
    const notched = await buildStone();
    const acc = positions(notched);
    const v = [0, 0, 0];
    acc.getElement(3, v); // a front-face vertex: push it inward (a notch like the scan's slot)
    acc.setElement(3, [v[0], v[1], v[2] - 0.05]);
    await makeCrackedHeadstone(plain, { seed: 33 });
    await makeCrackedHeadstone(notched, { seed: 33 });
    expect(notched.getRoot().getExtras().crackedHeadstone).toEqual(plain.getRoot().getExtras().crackedHeadstone);
    const bbox = { min: [-0.5, 0, -0.1], max: [0.5, 1.5, 0.1] };
    expect(fractureParams(33, bbox).normal).toEqual(fractureParams(33, bbox).normal);
    const p = fractureParams(33, bbox);
    expect(p.tiltDeg).toBeGreaterThanOrEqual(20);
    expect(p.tiltDeg).toBeLessThanOrEqual(40);
    expect(p.point[1]).toBeGreaterThan(0.45 * 1.5 - 1e-9);
  });

  it('changes the outline: silhouette XOR of the box slab is clearly above zero and the fracture is a real step', async () => {
    const a = await buildStone();
    const b = await buildStone();
    await makeCrackedHeadstone(b, { seed: 8 });
    const r = compareDocuments(a, b);
    expect(r.xor).toBeGreaterThan(0.01);
  });

  it.skipIf(!existsSync(INTACT))('Requirement 42.10: the cracked scan differs from the intact scan by at least 3 percent XOR (IoU 0.97 or lower)', async () => {
    const intact = await readModel(INTACT);
    const cracked = await readModel(INTACT);
    await makeCrackedHeadstone(cracked, { seed: 20260101 });
    const r = compareDocuments(intact, cracked);
    expect(r.xor).toBeGreaterThanOrEqual(XOR_THRESHOLD);
    expect(r.iou).toBeLessThanOrEqual(0.97);
    expect(countTriangles(cracked)).toBeLessThanOrEqual(20000);
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
