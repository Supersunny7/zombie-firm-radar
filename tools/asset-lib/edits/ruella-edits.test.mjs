// Unit tests for removeByVertexColor, raggedCut and tint (Requirement 43).
import { Document } from '@gltf-transform/core';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { countOpenEdges } from './geometry.mjs';
import { applyEdits, EditTargetMissing } from './index.mjs';
import { rgbToHsv } from './remove-by-color.mjs';

const RINGS = 40;
const SEG = 24;
const srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** Closed tube along x (0..4) with fan end caps; skin-coloured for x < 2.4, saturated red beyond, one blue patch. */
function tubeDoc() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = [];
  const col = [];
  const nor = [];
  const skin = (r, a) => [0.82 + 0.05 * Math.sin(r * 3 + a), 0.76, 0.66, 1];
  for (let r = 0; r < RINGS; r++) {
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const x = (4 * r) / (RINGS - 1);
      pos.push(x, Math.cos(a) * 0.5, Math.sin(a) * 0.5);
      nor.push(0, Math.cos(a), Math.sin(a));
      const blue = x > 1 && x < 1.3 && s < 3;
      col.push(...(x > 2.4 ? [0.9, 0.05, 0.05, 1] : blue ? [0.1, 0.1, 0.8, 1] : skin(r, a)));
    }
  }
  const idx = [];
  for (let r = 0; r < RINGS - 1; r++) {
    for (let s = 0; s < SEG; s++) {
      const a = r * SEG + s;
      const b = r * SEG + ((s + 1) % SEG);
      idx.push(a, b, a + SEG, b, b + SEG, a + SEG);
    }
  }
  for (const [ring, flip, x] of [[0, true, 0], [RINGS - 1, false, 4]]) {
    const c = pos.length / 3;
    pos.push(x, 0, 0);
    nor.push(flip ? -1 : 1, 0, 0);
    col.push(0.8, 0.75, 0.65, 1);
    for (let s = 0; s < SEG; s++) {
      const a = ring * SEG + s;
      const b = ring * SEG + ((s + 1) % SEG);
      idx.push(...(flip ? [a, c, b] : [a, b, c]));
    }
  }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer))
    .setAttribute('COLOR_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(col)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
  const mesh = doc.createMesh('arm').addPrimitive(prim);
  doc.createScene().addChild(doc.createNode('arm').setMesh(mesh));
  return { doc, prim };
}

const prim0 = (doc) => doc.getRoot().listMeshes()[0].listPrimitives()[0];
const triCount = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + p.getIndices().getCount() / 3, 0), 0);
const maxX = (doc) => Math.max(...Array.from(prim0(doc).getAttribute('POSITION').getArray()).filter((_, i) => i % 3 === 0));

function stats(doc) {
  const p = prim0(doc);
  const col = p.getAttribute('COLOR_0');
  let sum = 0;
  let n = 0;
  let red = 0;
  const vals = [];
  const c = [0, 0, 0, 0];
  for (let i = 0; i < col.getCount(); i++) {
    col.getElement(i, c);
    const [h, s] = rgbToHsv(c[0], c[1], c[2]);
    const v = Math.max(srgb(c[0]), srgb(c[1]), srgb(c[2]));
    sum += v;
    n++;
    vals.push(v);
    if (s > 0.5 && (h >= 330 || h <= 30)) red++;
  }
  return { mean: sum / n, red, vals };
}

describe('removeByVertexColor', () => {
  it('deletes the triangles inside the colour range and keeps the rest', async () => {
    const { doc } = tubeDoc();
    const before = triCount(doc);
    expect(stats(doc).red).toBeGreaterThan(0);
    await applyEdits(doc, [{ op: 'removeByVertexColor', mesh: 'arm', hueRange: [330, 30], minSat: 0.5 }]);
    expect(triCount(doc)).toBeLessThan(before);
    // only the boundary ring of mixed triangles may keep red vertices (raggedCut trims it)
    expect(stats(doc).red).toBeLessThanOrEqual(2 * SEG);
    expect(maxX(doc)).toBeLessThanOrEqual(4);
  });

  it('is a no-op on its own output', async () => {
    const { doc } = tubeDoc();
    const edit = { op: 'removeByVertexColor', mesh: 'arm', hueRange: [330, 30], minSat: 0.5 };
    await applyEdits(doc, [edit]);
    const n = triCount(doc);
    await applyEdits(doc, [edit]);
    expect(triCount(doc)).toBe(n);
  });

  it('with an `above` bound never removes a triangle on the keep side', async () => {
    const { doc } = tubeDoc();
    const edit = { op: 'removeByVertexColor', mesh: 'arm', hueRange: [330, 30], minSat: 0.5, axis: 'x', above: 3 };
    const xs = (d) => {
      const p = prim0(d);
      const pos = p.getAttribute('POSITION').getArray();
      const idx = p.getIndices();
      let n = 0;
      for (let i = 0; i < idx.getCount(); i += 3) if ([0, 1, 2].every((k) => pos[idx.getScalar(i + k) * 3] < 3)) n++;
      return n;
    };
    const keepSide = xs(doc);
    const before = triCount(doc);
    await applyEdits(doc, [edit]);
    expect(xs(doc)).toBe(keepSide); // keep-side triangles: 0 removed
    expect(triCount(doc)).toBeLessThan(before); // beyond the bound the red part is still removed
  });
  it('rejects `above` without a valid axis', async () => {
    const { doc } = tubeDoc();
    await expect(applyEdits(doc, [{ op: 'removeByVertexColor', mesh: 'arm', hueRange: [330, 30], above: 3 }])).rejects.toBeInstanceOf(RangeError);
  });  it('fails the pick when the mesh is missing (strict) and does nothing when tolerant', async () => {
    const { doc } = tubeDoc();
    const edit = { op: 'removeByVertexColor', mesh: 'nope', hueRange: [0, 30], minSat: 0.5 };
    await expect(applyEdits(doc, [edit], { pick: 'p' })).rejects.toBeInstanceOf(EditTargetMissing);
    const before = triCount(doc);
    await applyEdits(doc, [edit], { strict: false });
    expect(triCount(doc)).toBe(before);
  });
});

describe('joinMeshes', () => {
  /** Two halves of one tube (x < 2 and x >= 2) as two meshes sharing a seam ring, same material. */
  function halves() {
    const { doc } = tubeDoc();
    const p = prim0(doc);
    const mat = doc.createMaterial('skin');
    p.setMaterial(mat);
    const pos = p.getAttribute('POSITION').getArray();
    const idx = Array.from(p.getIndices().getArray());
    const right = [];
    const left = [];
    for (let t = 0; t < idx.length; t += 3) (Math.max(pos[idx[t] * 3], pos[idx[t + 1] * 3], pos[idx[t + 2] * 3]) > 2.01 ? right : left).push(idx[t], idx[t + 1], idx[t + 2]);
    const clone = p.clone();
    p.setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(left)));
    clone.setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(right)));
    const m2 = doc.createMesh('arm2').addPrimitive(clone);
    doc.getRoot().listScenes()[0].addChild(doc.createNode('arm2').setMesh(m2));
    return doc;
  }
  it('merges the meshes into the first one: seam closed, triangle count kept, idempotent', async () => {
    const doc = halves();
    const before = triCount(doc);
    expect(countOpenEdges(prim0(doc))).toBeGreaterThan(0); // the seam is open on each half
    await applyEdits(doc, [{ op: 'joinMeshes', meshes: ['arm', 'arm2'] }]);
    expect(doc.getRoot().listMeshes().map((m) => m.getName())).toEqual(['arm']);
    expect(triCount(doc)).toBe(before);
    expect(countOpenEdges(prim0(doc))).toBe(0);
    const n = prim0(doc).getAttribute('POSITION').getCount();
    await applyEdits(doc, [{ op: 'joinMeshes', meshes: ['arm', 'arm2'] }], { strict: false });
    expect(prim0(doc).getAttribute('POSITION').getCount()).toBe(n);
  });
  it('refuses meshes with different materials', async () => {
    const doc = halves();
    doc.getRoot().listMeshes()[1].listPrimitives()[0].setMaterial(doc.createMaterial('other'));
    await expect(applyEdits(doc, [{ op: 'joinMeshes', meshes: ['arm', 'arm2'] }])).rejects.toBeInstanceOf(RangeError);
  });
});describe('raggedCut', () => {
  const cut = { op: 'raggedCut', axis: 'x', at: 0.5, seed: 7, amplitude: 0.1 };

  it('removes everything beyond the jagged line and leaves no open edge', async () => {
    const { doc } = tubeDoc();
    expect(countOpenEdges(prim0(doc))).toBe(0);
    await applyEdits(doc, [cut]);
    const p = prim0(doc);
    expect(countOpenEdges(p)).toBe(0); // capped: the opening has no boundary edge
    const x = Array.from(p.getAttribute('POSITION').getArray()).filter((_, i) => i % 3 === 0);
    // plane at x = 2, amplitude 0.1 * 1.0 wide section = 0.1
    expect(Math.max(...x)).toBeLessThanOrEqual(2 + 0.1 + 1e-4);
    expect(Math.max(...x)).toBeGreaterThan(1.7);
  });

  it('is ragged, deterministic per seed and different across seeds', async () => {
    const edge = async (seed) => {
      const { doc } = tubeDoc();
      await applyEdits(doc, [{ ...cut, seed }]);
      const pos = prim0(doc).getAttribute('POSITION').getArray();
      const best = new Map();
      for (let i = 0; i < pos.length; i += 3) {
        const s = Math.round(((Math.atan2(pos[i + 2], pos[i + 1]) + Math.PI) / (Math.PI * 2)) * SEG) % SEG;
        best.set(s, Math.max(best.get(s) ?? -1, pos[i]));
      }
      return [...best.entries()].filter(([s]) => s < SEG).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    };
    const a = await edge(7);
    expect(await edge(7)).toEqual(a);
    expect(await edge(8)).not.toEqual(a);
    expect(Math.max(...a) - Math.min(...a)).toBeGreaterThan(0.03);
  });
  it('at amplitude 0.2 the edge is visibly torn: wide spread and many teeth, still capped', async () => {
    const { doc } = tubeDoc();
    await applyEdits(doc, [{ ...cut, amplitude: 0.2 }]);
    const p = prim0(doc);
    expect(countOpenEdges(p)).toBe(0);
    const pos = p.getAttribute('POSITION').getArray();
    const best = new Array(SEG).fill(-1);
    for (let i = 0; i < pos.length; i += 3) {
      if (Math.hypot(pos[i + 1], pos[i + 2]) < 0.4) continue; // skin ring only, not the cap centre
      const s = Math.round(((Math.atan2(pos[i + 2], pos[i + 1]) + Math.PI) / (Math.PI * 2)) * SEG) % SEG;
      best[s] = Math.max(best[s], pos[i]);
    }
    expect(Math.max(...best) - Math.min(...best)).toBeGreaterThan(0.15);
    // The fixture's rings quantise x, so count sign changes of the non-flat steps around the ring.
    const steps = best.map((v, s) => best[(s + 1) % SEG] - v).filter((d) => Math.abs(d) > 1e-6);
    let turns = 0;
    for (let s = 0; s < steps.length; s++) if (steps[s] * steps[(s + 1) % steps.length] < 0) turns++;
    expect(turns).toBeGreaterThanOrEqual(4); // at least 2 teeth around a 24-segment stump
  });

  it('is a no-op on its own output (marker)', async () => {
    const { doc } = tubeDoc();
    await applyEdits(doc, [cut]);
    const n = triCount(doc);
    const v = prim0(doc).getAttribute('POSITION').getCount();
    await applyEdits(doc, [cut]);
    expect(triCount(doc)).toBe(n);
    expect(prim0(doc).getAttribute('POSITION').getCount()).toBe(v);
  });

  it('fails the pick when the named mesh is missing', async () => {
    const { doc } = tubeDoc();
    await expect(applyEdits(doc, [{ ...cut, mesh: 'nope' }], { pick: 'p' })).rejects.toBeInstanceOf(EditTargetMissing);
  });

  it('rejects an invalid axis with a RangeError', async () => {
    const { doc } = tubeDoc();
    await expect(applyEdits(doc, [{ ...cut, axis: 'w' }])).rejects.toBeInstanceOf(RangeError);
  });
});

describe('tint', () => {
  const grade = { op: 'tint', hue: 100, minSaturation: 0.1, maxSaturation: 0.3, meanValue: 0.5, hueSpread: 12 };

  it('moves vertex colours to grey-green with mean value in 0.45-0.55 and keeps the detail', async () => {
    const { doc } = tubeDoc();
    const before = stats(doc);
    await applyEdits(doc, [grade]);
    const after = stats(doc);
    expect(after.mean).toBeGreaterThanOrEqual(0.45);
    expect(after.mean).toBeLessThanOrEqual(0.55);
    expect(after.red).toBe(0);
    // value differences between samples are scaled, not flattened
    const spread = (v) => Math.max(...v) - Math.min(...v);
    expect(spread(after.vals)).toBeGreaterThan(0.3 * spread(before.vals));
    const col = prim0(doc).getAttribute('COLOR_0');
    const c = [0, 0, 0, 0];
    for (let i = 0; i < col.getCount(); i += 17) {
      col.getElement(i, c);
      const [h, s] = rgbToHsv(srgb(c[0]), srgb(c[1]), srgb(c[2]));
      expect(h).toBeGreaterThanOrEqual(88 - 1);
      expect(h).toBeLessThanOrEqual(112 + 1);
      expect(s).toBeLessThanOrEqual(0.3 + 1e-3);
    }
  });

  it('is a no-op on its own output', async () => {
    const { doc } = tubeDoc();
    await applyEdits(doc, [grade]);
    const once = Array.from(prim0(doc).getAttribute('COLOR_0').getArray());
    await applyEdits(doc, [grade]);
    const twice = prim0(doc).getAttribute('COLOR_0').getArray();
    once.forEach((x, i) => expect(Math.abs(x - twice[i])).toBeLessThan(2e-3));
  });

  it('grades a base colour texture to the same mean value', async () => {
    const px = new Uint8Array(16 * 16 * 3);
    for (let i = 0; i < px.length; i += 3) px.set([230 - (i % 40), 200, 170], i);
    const doc = new Document();
    doc.createTexture('skin').setMimeType('image/png').setImage(new Uint8Array(await sharp(Buffer.from(px), { raw: { width: 16, height: 16, channels: 3 } }).png().toBuffer()));
    await applyEdits(doc, [{ ...grade, texture: 'skin' }]);
    const { data } = await sharp(Buffer.from(doc.getRoot().listTextures()[0].getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i += 3) sum += Math.max(data[i], data[i + 1], data[i + 2]) / 255;
    const mean = sum / (data.length / 3);
    expect(mean).toBeGreaterThanOrEqual(0.45);
    expect(mean).toBeLessThanOrEqual(0.55);
  });

  it('fails the pick when the texture or a listed mesh is missing', async () => {
    const { doc } = tubeDoc();
    await expect(applyEdits(doc, [{ ...grade, texture: 'nope' }], { pick: 'p' })).rejects.toBeInstanceOf(EditTargetMissing);
    await expect(applyEdits(doc, [{ ...grade, meshes: ['nope'] }], { pick: 'p' })).rejects.toBeInstanceOf(EditTargetMissing);
  });
});
