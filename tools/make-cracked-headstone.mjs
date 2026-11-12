// Cracked headstone derived from the intact scan (Requirement 39, design "Cracked-headstone script").
// Own-work tool: gltf-transform + meshoptimizer + sharp only. Seeded PRNG only (no Date, no Math.random).
//
//   node tools/make-cracked-headstone.mjs --in <glb|gltf|zip> --out <glb> [--seed <int>]
//
// Steps: (1) seeded crack height map in UV space, (2) Sobel normal map whiteout-blended onto the
// existing normal map (or a flat one), (3) chipped edge by position-quantised value noise so
// duplicated (UV seam) vertices move together, (4) decimate to at most 20,000 triangles,
// (5) mark root extras so a second run is detectable. No text is drawn anywhere (blank face).
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { countTriangles, decimate } from './asset-lib/edits/decimate.mjs';
import { extractZip } from './asset-lib/archive.mjs';
import { fractureParams, fractureTriangles, readPrimitive, writePrimitive } from './asset-lib/fracture.mjs';

export const MAX_TRIANGLES = 20000;
export const MAP_SIZE = 1024;
export const DEFAULT_SEED = 20260101;
export const MARKER_KEY = 'crackedHeadstone';
export const CRACKED_BY = 'make-cracked-headstone@3';
const PRE_FRACTURE_LIMIT = 16000; // headroom for the split and the rimmed caps (3 triangles per cut edge) under MAX_TRIANGLES
const SOBEL_STRENGTH = 2.5;
const HEIGHT_CLAMP = 0.02; // per-vertex vertical move, fraction of height (two ends => under 5 %)

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_OUT = path.join(HERE, 'cache', 'generated', 'own-headstone-cracked.glb');

/** Thrown when the derivation cannot be done (for example no UVs). The pipeline falls back (39.8). */
export class CrackedHeadstoneImpossible extends Error {
  constructor(reason) {
    super(`cracked headstone impossible: ${reason}`);
    this.name = 'CrackedHeadstoneImpossible';
    this.reason = reason;
  }
}

// ---------------------------------------------------------------- PRNG and noise

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(seed, x, y, z) {
  let h = (seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/** Seeded 3D value noise in [0, 1]. */
export function valueNoise3(seed, x, y, z) {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = smooth(x - x0), fy = smooth(y - y0), fz = smooth(z - z0);
  const c = (dx, dy, dz) => hash3(seed, x0 + dx, y0 + dy, z0 + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

// ---------------------------------------------------------------- crack height map

function stamp(field, n, cx, cy, w) {
  const r = Math.ceil(w);
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(n - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(n - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= w) continue;
      const v = 1 - d / w; // V profile: depth 1 at the centre, 0 at w
      const i = y * n + x;
      if (v > field[i]) field[i] = v;
    }
  }
}

/** Walk one stroke; returns the visited points. Image y grows downward. */
function walk(rng, field, n, x, y, heading, maxPx, width, pull) {
  const pts = [];
  let travelled = 0;
  for (let guard = 0; guard < 4000 && travelled < maxPx; guard++) {
    if (x < 0 || y < 0 || x >= n || y >= n) break;
    stamp(field, n, x, y, width);
    pts.push([x, y]);
    const step = 3 + rng() * 3;
    heading += (rng() - 0.5) * 2 * 0.35 + (Math.PI / 2 - heading) * pull;
    x += Math.cos(heading) * step;
    y += Math.sin(heading) * step;
    travelled += step;
  }
  return pts;
}

/** Seeded crack height field (1 = deepest). Exported for tests. */
export function crackHeightMap(seed, n = MAP_SIZE) {
  const rng = mulberry32(seed ^ 0xc4ac4);
  const field = new Float32Array(n * n);
  const mains = 1 + Math.floor(rng() * 2);
  for (let m = 0; m < mains; m++) {
    const x = n * (0.25 + rng() * 0.5);
    const y = n * (0.02 + rng() * 0.3);
    const width = 2 + rng() * 3;
    const pts = walk(rng, field, n, x, y, Math.PI / 2 + (rng() - 0.5) * 0.4, n * 1.2, width, 0.1);
    const branches = 2 + Math.floor(rng() * 3);
    for (let b = 0; b < branches && pts.length > 2; b++) {
      const [bx, by] = pts[Math.floor(rng() * pts.length)];
      const side = rng() < 0.5 ? -1 : 1;
      const heading = Math.PI / 2 + side * (0.5 + rng() * 0.6);
      walk(rng, field, n, bx, by, heading, 40 + rng() * 80, 2 + rng() * 2, 0);
    }
  }
  // Rough walls: faint noise only where a crack exists, so the blank face stays blank.
  const nseed = (seed ^ 0x9a11) | 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (field[i] > 0) field[i] *= 0.85 + 0.3 * valueNoise3(nseed, x / 9, y / 9, 0);
    }
  }
  return field;
}

/** Sobel of the crack field to tangent-space normals (glTF: +Y up in the image), as floats xyz. */
export function crackNormals(field, n = MAP_SIZE, strength = SOBEL_STRENGTH) {
  const out = new Float32Array(n * n * 3);
  const h = (x, y) => field[Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const gx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1)) / 8;
      const gy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1)) / 8;
      // Surface height is -field (a groove). n = (-dH/dx, dH/dy_img, 1) = (gx, -gy, 1) * strength on xy.
      const nx = gx * strength, ny = -gy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const o = (y * n + x) * 3;
      out[o] = nx / len;
      out[o + 1] = ny / len;
      out[o + 2] = nz / len;
    }
  }
  return out;
}

async function decodeNormalMap(texture, n) {
  const image = texture?.getImage();
  if (!image) return null;
  try {
    const { data } = await sharp(Buffer.from(image))
      .resize(n, n, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return data;
  } catch {
    return null; // undecodable (for example KTX2): the crack normals replace it
  }
}

/** Whiteout blend n = normalize(n1.xy + n2.xy, n1.z * n2.z), written as RGB bytes. */
export async function blendNormalMap(existingTexture, crack, n = MAP_SIZE) {
  const base = await decodeNormalMap(existingTexture, n);
  const rgb = Buffer.alloc(n * n * 3);
  for (let i = 0; i < n * n; i++) {
    let x1 = 0, y1 = 0, z1 = 1;
    if (base) {
      x1 = (base[i * 3] / 255) * 2 - 1;
      y1 = (base[i * 3 + 1] / 255) * 2 - 1;
      z1 = (base[i * 3 + 2] / 255) * 2 - 1;
    }
    const x = x1 + crack[i * 3], y = y1 + crack[i * 3 + 1], z = z1 * crack[i * 3 + 2];
    const len = Math.hypot(x, y, z) || 1;
    rgb[i * 3] = Math.round(((x / len) * 0.5 + 0.5) * 255);
    rgb[i * 3 + 1] = Math.round(((y / len) * 0.5 + 0.5) * 255);
    rgb[i * 3 + 2] = Math.round(((z / len) * 0.5 + 0.5) * 255);
  }
  return sharp(rgb, { raw: { width: n, height: n, channels: 3 } }).png({ compressionLevel: 9 }).toBuffer();
}

// ---------------------------------------------------------------- chipped edge

function inverseAffine(m) {
  // Column-major 4x4, general inverse (cofactor form).
  const inv = new Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  inv[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  inv[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  inv[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  inv[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  inv[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  inv[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  inv[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  inv[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  inv[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  inv[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  inv[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  inv[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  inv[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  inv[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  inv[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  inv[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return inv;
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const apply = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

/** Distinct POSITION accessors with the world matrix of the first node that uses their mesh. */
function positionTargets(doc) {
  const matrixByMesh = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh && !matrixByMesh.has(mesh)) matrixByMesh.set(mesh, node.getWorldMatrix());
  }
  const seen = new Set();
  const targets = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    const M = matrixByMesh.get(mesh) ?? IDENTITY;
    for (const prim of mesh.listPrimitives()) {
      const acc = prim.getAttribute('POSITION');
      if (!acc || seen.has(acc)) continue;
      seen.add(acc);
      targets.push({ acc, M, inv: inverseAffine(M) });
    }
  }
  return targets;
}

/** Move vertices near the top and side edges; the move depends on the quantised position only. */
export function chipEdges(doc, seed) {
  const targets = positionTargets(doc).filter((t) => t.inv);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const v = [0, 0, 0];
  for (const { acc, M } of targets) {
    for (let i = 0; i < acc.getCount(); i++) {
      acc.getElement(i, v);
      const p = apply(M, v[0], v[1], v[2]);
      for (let k = 0; k < 3; k++) {
        if (p[k] < min[k]) min[k] = p[k];
        if (p[k] > max[k]) max[k] = p[k];
      }
    }
  }
  if (!Number.isFinite(min[0])) return;
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const centre = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
  const amplitude = 0.12 * size[0];
  const nseed = (seed ^ 0xc41b) | 0;
  const q = (p, k) => (size[k] > 0 ? Math.round(((p[k] - min[k]) / size[k]) * 10000) : 0);

  for (const { acc, M, inv } of targets) {
    for (let i = 0; i < acc.getCount(); i++) {
      acc.getElement(i, v);
      const p = apply(M, v[0], v[1], v[2]);
      const high = size[1] > 0 && (p[1] - min[1]) / size[1] > 0.8;
      const side = size[0] > 0 && Math.min(p[0] - min[0], max[0] - p[0]) / size[0] < 0.06;
      if (!high && !side) continue;
      const qx = q(p, 0), qy = q(p, 1), qz = q(p, 2);
      const fx = qx / 10000, fy = qy / 10000, fz = qz / 10000;
      const noise = 0.65 * valueNoise3(nseed, fx * 5, fy * 5, fz * 5) + 0.35 * valueNoise3(nseed + 1, fx * 11, fy * 11, fz * 11);
      const chip = Math.min(1, Math.max(0, (noise - 0.5) / 0.4));
      if (chip === 0) continue;
      const d = chip * amplitude;
      let dx = centre[0] - p[0], dy = centre[1] - p[1], dz = centre[2] - p[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      dx = (dx / len) * d; dy = (dy / len) * d; dz = (dz / len) * d;
      const maxDy = HEIGHT_CLAMP * size[1];
      dy = Math.max(-maxDy, Math.min(maxDy, dy));
      const local = apply(inv, p[0] + dx, p[1] + dy, p[2] + dz);
      acc.setElement(i, local);
    }
  }
}

// ---------------------------------------------------------------- fracture (Requirement 42)

/** Primitives with the world matrix of the first node that uses their mesh. */
function trianglePrimitives(doc) {
  const matrixByMesh = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh && !matrixByMesh.has(mesh)) matrixByMesh.set(mesh, node.getWorldMatrix());
  }
  const out = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    const M = matrixByMesh.get(mesh) ?? IDENTITY;
    const inv = inverseAffine(M);
    if (!inv) continue;
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() === 4 && prim.getAttribute('POSITION')) out.push({ prim, M, inv });
    }
  }
  return out;
}

/** Darken the fracture edge in the base colour texture: sharp, 2 to 4 px, seeded jitter. */
async function paintCrackLine(materials, uvSegments, seed) {
  const done = new Set();
  const rng = mulberry32((seed ^ 0xb1ac) >>> 0);
  const nseed = (seed ^ 0x51de) | 0;
  const widths = uvSegments.map(() => 2 + Math.floor(rng() * 3));
  for (const mat of materials) {
    const tex = mat.getBaseColorTexture();
    if (!tex || done.has(tex) || !tex.getImage()) continue;
    done.add(tex);
    let decoded;
    try {
      decoded = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    } catch {
      continue; // undecodable (for example KTX2): vertex colour alone darkens the cut faces
    }
    const { data, info } = decoded;
    const w = info.width, h = info.height, ch = info.channels;
    const disk = (cx, cy, r) => {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if (x < 0 || y < 0 || x >= w || y >= h || (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > r * r) continue;
          const o = (y * w + x) * ch;
          data[o] = Math.round(data[o] * 0.14);
          data[o + 1] = Math.round(data[o + 1] * 0.13);
          data[o + 2] = Math.round(data[o + 2] * 0.12);
        }
      }
    };
    uvSegments.forEach(([u0, v0, u1, v1], s) => {
      const x0 = u0 * w, y0 = v0 * h, x1 = u1 * w, y1 = v1 * h;
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len > w * 0.5) return; // segment across a UV seam, not a stroke
      const nx = len > 0 ? -(y1 - y0) / len : 0, ny = len > 0 ? (x1 - x0) / len : 0;
      const steps = Math.max(1, Math.ceil(len * 2));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        const j = (valueNoise3(nseed, x / 6, y / 6, 0) - 0.5) * 2.4;
        disk(x + nx * j, y + ny * j, widths[s] / 2);
      }
    });
    const png = await sharp(data, { raw: { width: w, height: h, channels: ch } }).png({ compressionLevel: 9 }).toBuffer();
    tex.setImage(new Uint8Array(png)).setMimeType('image/png');
  }
}

/**
 * Fracture the slab: diagonal plane split, offset top piece, chipped upper corner, capped cuts,
 * dark crack line in the base colour texture. Returns the parameters used.
 */
export async function fractureHeadstone(doc, materials, seed) {
  const prims = trianglePrimitives(doc);
  const read = prims.map((p) => ({ ...p, ...readPrimitive(p.prim, p.M, p.inv) }));
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const r of read) {
    for (const t of r.tris) {
      for (const v of t) {
        for (let k = 0; k < 3; k++) {
          if (v[k] < min[k]) min[k] = v[k];
          if (v[k] > max[k]) max[k] = v[k];
        }
      }
    }
  }
  if (!Number.isFinite(min[0])) throw new CrackedHeadstoneImpossible('the model has no triangle geometry');
  const params = fractureParams(seed, { min, max });
  const uvSegments = [];
  for (const r of read) {
    const res = fractureTriangles(r.tris, params);
    uvSegments.push(...res.uvSegments);
    writePrimitive(doc, r.prim, res.tris, r.M, r.inv, r.hasTangent);
  }
  await paintCrackLine(materials, uvSegments, seed);
  return params;
}

// ---------------------------------------------------------------- main entry

export function isCracked(doc) {
  return Boolean(doc.getRoot().getExtras()?.[MARKER_KEY]);
}

function stoneMaterials(doc) {
  const materials = [];
  let fallback = null;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4 && prim.getMode() !== 5 && prim.getMode() !== 6) continue;
      if (!prim.getAttribute('TEXCOORD_0')) {
        throw new CrackedHeadstoneImpossible('the model has no UVs (TEXCOORD_0), so a crack normal map cannot be mapped');
      }
      let mat = prim.getMaterial();
      if (!mat) {
        fallback ??= doc.createMaterial('stone');
        mat = fallback;
        prim.setMaterial(mat);
      }
      if (!materials.includes(mat)) materials.push(mat);
    }
  }
  if (materials.length === 0) throw new CrackedHeadstoneImpossible('the model has no triangle geometry');
  return materials;
}

/**
 * Derive the cracked headstone in place. Deterministic for a given input and seed.
 * A document that already carries the marker is returned unchanged.
 */
export async function makeCrackedHeadstone(doc, { seed = DEFAULT_SEED } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError(`seed must be an integer in [0, 4294967295], got ${seed}`);
  }
  if (isCracked(doc)) return doc;
  const materials = stoneMaterials(doc); // throws before any change when impossible

  // Leave headroom: the split and the caps add triangles, and decimating afterwards would weld the gap shut.
  if (countTriangles(doc) > PRE_FRACTURE_LIMIT) await decimate(doc, { triangles: PRE_FRACTURE_LIMIT }, { pick: 'cracked-headstone' });

  const crack = crackNormals(crackHeightMap(seed));
  const done = new Map(); // old normal texture (or null) -> new texture
  for (const mat of materials) {
    const old = mat.getNormalTexture();
    if (!done.has(old)) {
      const png = await blendNormalMap(old, crack);
      const tex = old ?? doc.createTexture('stone-normal');
      tex.setImage(new Uint8Array(png)).setMimeType('image/png');
      done.set(old, tex);
    }
    mat.setNormalTexture(done.get(old));
    mat.getNormalTextureInfo().setTexCoord(0);
  }

  chipEdges(doc, seed);
  const fracture = await fractureHeadstone(doc, materials, seed);

  if (countTriangles(doc) > MAX_TRIANGLES) await decimate(doc, { triangles: MAX_TRIANGLES }, { pick: 'cracked-headstone' });

  const root = doc.getRoot();
  const round = (x) => Math.round(x * 1e4) / 1e4;
  root.setExtras({
    ...(root.getExtras() ?? {}),
    crackedBy: CRACKED_BY,
    [MARKER_KEY]: {
      version: 2,
      seed,
      assumedHeightM: fracture.assumedHeightM,
      offsetCm: round(fracture.offsetCm),
      offsetUnits: round(fracture.offsetUnits),
      heightUnits: round(fracture.size[1]),
      tiltDeg: round(fracture.tiltDeg),
    },
  });
  return doc;
}

// ---------------------------------------------------------------- IO and CLI

async function makeIO() {
  await MeshoptDecoder.ready;
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
}

async function findModel(dir) {
  const found = [];
  const walkDir = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walkDir(p);
      else if (/\.(glb|gltf)$/i.test(e.name)) found.push(p);
    }
  };
  await walkDir(dir);
  found.sort((a, b) => (/\.glb$/i.test(a) === /\.glb$/i.test(b) ? a.localeCompare(b) : /\.glb$/i.test(a) ? -1 : 1));
  return found[0] ?? null;
}

export async function readModel(input) {
  const io = await makeIO();
  let tmp = null;
  try {
    let file = input;
    if (/\.zip$/i.test(input)) {
      tmp = await mkdtemp(path.join(os.tmpdir(), 'cracked-in-'));
      await extractZip(input, tmp);
      file = await findModel(tmp);
      if (!file) throw new Error(`no .glb or .gltf inside ${input}`);
    }
    const doc = await io.read(file);
    for (const ext of doc.getRoot().listExtensionsUsed()) {
      if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
    }
    return doc;
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true });
  }
}

export async function writeModel(doc, out) {
  const io = await makeIO();
  await mkdir(path.dirname(out), { recursive: true });
  const bytes = await io.writeBinary(doc);
  await writeFile(out, bytes);
  return bytes;
}

export function parseArgs(argv) {
  const args = { in: null, out: DEFAULT_OUT, seed: DEFAULT_SEED };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.in = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--seed') args.seed = Number(argv[++i]);
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (!args.in) {
    console.error('usage: node make-cracked-headstone.mjs --in <glb|gltf|zip> --out <glb> [--seed <int>]');
    return 2;
  }
  if (!existsSync(args.in) || !statSync(args.in).isFile()) {
    console.error(`make-cracked-headstone: intact scan not found: ${args.in}. Procedural headstones stay as the fallback.`);
    return 1;
  }
  try {
    const doc = await readModel(args.in);
    await makeCrackedHeadstone(doc, { seed: args.seed });
    await writeModel(doc, args.out);
    console.log(`make-cracked-headstone: wrote ${args.out} (${countTriangles(doc)} triangles, seed ${args.seed})`);
    return 0;
  } catch (e) {
    console.error(`make-cracked-headstone: ${e.message}. Procedural headstones stay as the fallback.`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
