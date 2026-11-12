// Plane-split geometry for the cracked headstone (Requirement 42). Own work, plain typed-array math.
//
// Pipeline on world-space triangles (y up, x width, z depth):
//   1. clip every triangle against a seeded diagonal fracture plane (new vertices carry interpolated
//      normal, tangent, UV and colour), cap both cut faces with a centroid fan;
//   2. clip the top piece with a second plane that removes one upper corner, cap that cut too;
//   3. move the top piece by 2 to 3.3 cm (scaled from the assumed real height) and tilt it a little.
// Everything depends on the seed and the bounding box only, never on the face detail, so a
// pre-existing notch on the face cannot move the fracture (Requirement 42.9).

export const ASSUMED_HEIGHT_M = 0.9;
export const STRIDE = 16; // pos3 nor3 tan4 uv2 col4
const P = 0, N = 3, T = 6, UV = 10, C = 12;
const DEG = Math.PI / 180;

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- vertices

function norm3(v, o) {
  const l = Math.hypot(v[o], v[o + 1], v[o + 2]);
  if (l > 1e-12) {
    v[o] /= l; v[o + 1] /= l; v[o + 2] /= l;
  }
}

function lerpVertex(a, b, t) {
  const o = new Float64Array(STRIDE);
  for (let i = 0; i < STRIDE; i++) o[i] = a[i] + (b[i] - a[i]) * t;
  o[T + 3] = a[T + 3];
  norm3(o, N);
  norm3(o, T);
  return o;
}

function lexLess(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}

/** Intersection on edge a-b, always computed from the lexicographically smaller end so shared edges agree. */
function intersect(a, b, da, db) {
  return lexLess(a, b) ? lerpVertex(a, b, da / (da - db)) : lerpVertex(b, a, db / (db - da));
}

/**
 * Clip triangles by the plane n.(p - c) = 0. Returns the triangles on the positive side, on the negative
 * side, and the cut segments oriented as they run on the positive polygons.
 */
export function clipByPlane(tris, n, c, eps) {
  const pos = [], neg = [], segs = [];
  const dist = (v) => {
    const d = n[0] * (v[0] - c[0]) + n[1] * (v[1] - c[1]) + n[2] * (v[2] - c[2]);
    return Math.abs(d) < eps ? eps : d;
  };
  for (const tri of tris) {
    const d = [dist(tri[0]), dist(tri[1]), dist(tri[2])];
    if (d[0] > 0 && d[1] > 0 && d[2] > 0) { pos.push(tri); continue; }
    if (d[0] < 0 && d[1] < 0 && d[2] < 0) { neg.push(tri); continue; }
    const pp = [], np = [];
    let exit = null, enter = null;
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      (d[i] > 0 ? pp : np).push(tri[i]);
      if (d[i] > 0 !== d[j] > 0) {
        const x = intersect(tri[i], tri[j], d[i], d[j]);
        pp.push(x); np.push(x);
        if (d[i] > 0) exit = x; else enter = x;
      }
    }
    for (let k = 1; k + 1 < pp.length; k++) pos.push([pp[0], pp[k], pp[k + 1]]);
    for (let k = 1; k + 1 < np.length; k++) neg.push([np[0], np[k], np[k + 1]]);
    if (exit && enter) segs.push([exit, enter]);
  }
  return { pos, neg, segs };
}

/** UV units per model unit, from the area ratio of the source triangles (used for planar projection on caps). */
export function uvDensity(tris) {
  let a3 = 0, a2 = 0;
  for (const [p, q, r] of tris) {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
    const wx = r[0] - p[0], wy = r[1] - p[1], wz = r[2] - p[2];
    a3 += 0.5 * Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
    a2 += 0.5 * Math.abs((q[UV] - p[UV]) * (r[UV + 1] - p[UV + 1]) - (r[UV] - p[UV]) * (q[UV + 1] - p[UV + 1]));
  }
  return a3 > 0 && a2 > 0 ? Math.sqrt(a2 / a3) : 1;
}
const RIM_SHARE = 0.07; // width of the dark crack rim, share of the cap radius

/**
 * Cap a cut with a centroid fan whose triangles face `outward`. Cut points keep their positions.
 * UVs are a planar projection of the cap onto the stone base-colour texture (`uvScale` UV per unit), so the
 * cap shows stone grain. Only a thin rim next to the fracture edge carries the dark `colour`; the inside is 1.
 */
export function capFan(segs, outward, colour, uvScale = 1) {
  if (segs.length === 0) return [];
  const cen = [0, 0, 0];
  let uvu = 0, uvv = 0;
  for (const [a, b] of segs) {
    for (let k = 0; k < 3; k++) cen[k] += a[P + k] + b[P + k];
    uvu += a[UV] + b[UV]; uvv += a[UV + 1] + b[UV + 1];
  }
  const cnt = segs.length * 2;
  for (let k = 0; k < 3; k++) cen[k] /= cnt;
  uvu /= cnt; uvv /= cnt;
  // In-plane tangent for the normal map; the bitangent completes the planar projection frame.
  let t = [outward[1], -outward[0], 0];
  if (Math.hypot(t[0], t[1], t[2]) < 1e-6) t = [0, 1, 0];
  const tl = Math.hypot(t[0], t[1], t[2]);
  t = [t[0] / tl, t[1] / tl, t[2] / tl];
  const bt = [outward[1] * t[2] - outward[2] * t[1], outward[2] * t[0] - outward[0] * t[2], outward[0] * t[1] - outward[1] * t[0]];
  const mk = (p, c) => {
    const v = new Float64Array(STRIDE);
    v[P] = p[0]; v[P + 1] = p[1]; v[P + 2] = p[2];
    v[N] = outward[0]; v[N + 1] = outward[1]; v[N + 2] = outward[2];
    v[T] = t[0]; v[T + 1] = t[1]; v[T + 2] = t[2]; v[T + 3] = 1;
    const d = [p[0] - cen[0], p[1] - cen[1], p[2] - cen[2]];
    v[UV] = uvu + uvScale * (d[0] * t[0] + d[1] * t[1] + d[2] * t[2]);
    v[UV + 1] = uvv + uvScale * (d[0] * bt[0] + d[1] * bt[1] + d[2] * bt[2]);
    v[C] = c; v[C + 1] = c * 0.97; v[C + 2] = c * 0.94; v[C + 3] = 1;
    return v;
  };
  const centre = mk(cen, 1);
  const inner = (a) => [0, 1, 2].map((k) => cen[k] + (1 - RIM_SHARE) * (a[k] - cen[k]));
  const out = [];
  const facing = (x, y, z) => {
    const ux = y[0] - x[0], uy = y[1] - x[1], uz = y[2] - x[2];
    const wx = z[0] - x[0], wy = z[1] - x[1], wz = z[2] - x[2];
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
    return [Math.hypot(cx, cy, cz), cx * outward[0] + cy * outward[1] + cz * outward[2]];
  };
  const push = (x, y, z) => {
    const [area2, dot] = facing(x, y, z);
    if (area2 < 1e-12) return;
    out.push(dot > 0 ? [x, y, z] : [x, z, y]);
  };
  for (const [a, b] of segs) {
    const va = mk([a[0], a[1], a[2]], colour), vb = mk([b[0], b[1], b[2]], colour);
    const ia = mk(inner(a), 1), ib = mk(inner(b), 1);
    push(va, vb, ib);
    push(va, ib, ia);
    push(centre, ia, ib);
  }
  return out;
}// ---------------------------------------------------------------- parameters

/** Seeded fracture parameters. Depend on the seed and the bounding box only. */
export function fractureParams(seed, bbox) {
  const rng = mulberry((seed ^ 0xf4ac7) >>> 0);
  const size = [bbox.max[0] - bbox.min[0], bbox.max[1] - bbox.min[1], bbox.max[2] - bbox.min[2]];
  const side = rng() < 0.5 ? -1 : 1; // fracture rises toward x = side
  const tiltDeg = 20 + rng() * 20;
  const heightFrac = 0.45 + rng() * 0.15;
  const offsetCm = 2 + rng() * 1.3;
  const wedgeDeg = 35 + rng() * 20;
  const wedgeFrac = 0.1 + rng() * 0.03; // depth of the chip, share of the slab width
  const tipDeg = (rng() < 0.5 ? -1 : 1) * 0.8;
  const offsetUnits = (offsetCm / 100 / ASSUMED_HEIGHT_M) * size[1];
  const th = tiltDeg * DEG;
  const nrm = [-side * Math.sin(th), Math.cos(th), 0];
  const down = [-side * Math.cos(th), -Math.sin(th), 0];
  const lift = 20 * DEG;
  return {
    seed, side, tiltDeg, heightFrac, offsetCm, offsetUnits, wedgeDeg, wedgeFrac, tipDeg,
    assumedHeightM: ASSUMED_HEIGHT_M,
    size,
    point: [(bbox.min[0] + bbox.max[0]) / 2, bbox.min[1] + heightFrac * size[1], (bbox.min[2] + bbox.max[2]) / 2],
    normal: nrm,
    translation: [0, 1, 2].map((k) => offsetUnits * (Math.cos(lift) * down[k] + Math.sin(lift) * nrm[k])),
  };
}

// ---------------------------------------------------------------- main stage

const FRACTURE_COLOUR = 0.3;
const WEDGE_COLOUR = 0.5;

function movePiece(tris, prm) {
  const a = prm.tipDeg * DEG, cs = Math.cos(a), sn = Math.sin(a);
  const [px, py] = prm.point;
  const map = new Map();
  const move = (v) => {
    let o = map.get(v);
    if (o) return o;
    o = Float64Array.from(v);
    const x = v[0] - px, y = v[1] - py;
    o[0] = px + cs * x - sn * y + prm.translation[0];
    o[1] = py + sn * x + cs * y + prm.translation[1];
    o[2] = v[2] + prm.translation[2];
    o[N] = cs * v[N] - sn * v[N + 1]; o[N + 1] = sn * v[N] + cs * v[N + 1];
    o[T] = cs * v[T] - sn * v[T + 1]; o[T + 1] = sn * v[T] + cs * v[T + 1];
    map.set(v, o);
    return o;
  };
  return tris.map((t) => [move(t[0]), move(t[1]), move(t[2])]);
}

/**
 * Fracture one set of world-space triangles.
 * Returns { tris, uvSegments } where uvSegments are the fracture edge in UV space (for the texture line).
 */
export function fractureTriangles(tris, prm) {
  const eps = 1e-7 * Math.max(...prm.size, 1e-9);
  const uvScale = uvDensity(tris);
  const cut = clipByPlane(tris, prm.normal, prm.point, eps);
  const cutNeg = prm.normal.map((x) => -x);
  const bottom = cut.neg.concat(capFan(cut.segs, prm.normal, FRACTURE_COLOUR, uvScale));
  let top = cut.pos.concat(capFan(cut.segs, cutNeg, FRACTURE_COLOUR, uvScale));

  // Upper corner on the downhill side, where the top piece is tallest.
  const wa = prm.wedgeDeg * DEG;
  const n2 = [-prm.side * Math.cos(wa), Math.sin(wa), 0];
  let pmax = -Infinity;
  for (const t of top) for (const v of t) pmax = Math.max(pmax, n2[0] * v[0] + n2[1] * v[1] + n2[2] * v[2]);
  if (Number.isFinite(pmax)) {
    const depth = prm.wedgeFrac * prm.size[0];
    const level = pmax - depth;
    // A point on the plane n2.p = level.
    const c2 = [n2[0] * level, n2[1] * level, n2[2] * level];
    const w = clipByPlane(top, n2, c2, eps);
    top = w.neg.concat(capFan(w.segs, n2, WEDGE_COLOUR, uvScale));
  }

  const moved = movePiece(top, prm);
  const uvSegments = cut.segs.map(([a, b]) => [a[UV], a[UV + 1], b[UV], b[UV + 1]]);
  return { tris: bottom.concat(moved), uvSegments };
}

// ---------------------------------------------------------------- matrices (column-major 4x4)

export const xformPoint = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
const xformDir = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z,
  m[1] * x + m[5] * y + m[9] * z,
  m[2] * x + m[6] * y + m[10] * z,
];
// n_local = M^T n_world
const xformNormalToLocal = (m, x, y, z) => [
  m[0] * x + m[1] * y + m[2] * z,
  m[4] * x + m[5] * y + m[6] * z,
  m[8] * x + m[9] * y + m[10] * z,
];

// ---------------------------------------------------------------- glTF primitive IO

/** Read a triangle primitive into world-space vertices. */
export function readPrimitive(prim, M, inv) {
  const posA = prim.getAttribute('POSITION');
  const norA = prim.getAttribute('NORMAL');
  const tanA = prim.getAttribute('TANGENT');
  const uvA = prim.getAttribute('TEXCOORD_0');
  const colA = prim.getAttribute('COLOR_0');
  const count = posA.getCount();
  const verts = new Array(count);
  const e = [0, 0, 0, 1];
  for (let i = 0; i < count; i++) {
    const v = new Float64Array(STRIDE);
    posA.getElement(i, e);
    const p = xformPoint(M, e[0], e[1], e[2]);
    v[0] = p[0]; v[1] = p[1]; v[2] = p[2];
    if (norA) {
      norA.getElement(i, e);
      const n = xformNormalToLocal(inv, e[0], e[1], e[2]); // world normal = M^-T n
      v[N] = n[0]; v[N + 1] = n[1]; v[N + 2] = n[2];
      norm3(v, N);
    }
    if (tanA) {
      tanA.getElement(i, e);
      const t = xformDir(M, e[0], e[1], e[2]);
      v[T] = t[0]; v[T + 1] = t[1]; v[T + 2] = t[2]; v[T + 3] = e[3];
      norm3(v, T);
    }
    uvA.getElement(i, e);
    v[UV] = e[0]; v[UV + 1] = e[1];
    if (colA) {
      const c = [1, 1, 1, 1];
      colA.getElement(i, c);
      v[C] = c[0]; v[C + 1] = c[1]; v[C + 2] = c[2]; v[C + 3] = colA.getElementSize() === 4 ? c[3] : 1;
    } else {
      v[C] = v[C + 1] = v[C + 2] = v[C + 3] = 1;
    }
    verts[i] = v;
  }
  const idx = prim.getIndices();
  const n = idx ? idx.getCount() : count;
  const tris = [];
  for (let i = 0; i + 2 < n; i += 3) {
    const a = idx ? idx.getScalar(i) : i, b = idx ? idx.getScalar(i + 1) : i + 1, c = idx ? idx.getScalar(i + 2) : i + 2;
    const t = [verts[a], verts[b], verts[c]];
    if (!norA) { // flat normal
      const ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2];
      const wx = t[2][0] - t[0][0], wy = t[2][1] - t[0][1], wz = t[2][2] - t[0][2];
      const fn = new Float64Array(3);
      fn[0] = uy * wz - uz * wy; fn[1] = uz * wx - ux * wz; fn[2] = ux * wy - uy * wx;
      norm3(fn, 0);
      for (const v of t) if (v[N] === 0 && v[N + 1] === 0 && v[N + 2] === 0) { v[N] = fn[0]; v[N + 1] = fn[1]; v[N + 2] = fn[2]; }
    }
    tris.push(t);
  }
  return { tris, hasTangent: Boolean(tanA) };
}

/** Replace the primitive's attributes and indices with the given world-space triangles (local float32 output). */
export function writePrimitive(doc, prim, tris, M, inv, hasTangent) {
  const old = prim.listAttributes().concat(prim.getIndices() ? [prim.getIndices()] : []);
  const buffer = prim.getAttribute('POSITION').getBuffer() ?? doc.getRoot().listBuffers()[0];
  const nv = tris.length * 3;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), tan = hasTangent ? new Float32Array(nv * 4) : null;
  const uv = new Float32Array(nv * 2), col = new Float32Array(nv * 4);
  const idx = nv > 65535 ? new Uint32Array(nv) : new Uint16Array(nv);
  let o = 0;
  for (const t of tris) {
    for (const v of t) {
      const p = xformPoint(inv, v[0], v[1], v[2]);
      pos[o * 3] = p[0]; pos[o * 3 + 1] = p[1]; pos[o * 3 + 2] = p[2];
      const n = xformNormalToLocal(M, v[N], v[N + 1], v[N + 2]);
      const nl = Math.hypot(n[0], n[1], n[2]) || 1;
      nor[o * 3] = n[0] / nl; nor[o * 3 + 1] = n[1] / nl; nor[o * 3 + 2] = n[2] / nl;
      if (tan) {
        const d = xformDir(inv, v[T], v[T + 1], v[T + 2]);
        const dl = Math.hypot(d[0], d[1], d[2]) || 1;
        tan[o * 4] = d[0] / dl; tan[o * 4 + 1] = d[1] / dl; tan[o * 4 + 2] = d[2] / dl; tan[o * 4 + 3] = v[T + 3] || 1;
      }
      uv[o * 2] = v[UV]; uv[o * 2 + 1] = v[UV + 1];
      for (let k = 0; k < 4; k++) col[o * 4 + k] = v[C + k];
      idx[o] = o;
      o++;
    }
  }
  const acc = (type, arr, norm = false) => doc.createAccessor().setType(type).setArray(arr).setNormalized(norm).setBuffer(buffer);
  for (const sem of prim.listSemantics()) prim.setAttribute(sem, null);
  prim.setAttribute('POSITION', acc('VEC3', pos));
  prim.setAttribute('NORMAL', acc('VEC3', nor));
  if (tan) prim.setAttribute('TANGENT', acc('VEC4', tan));
  prim.setAttribute('TEXCOORD_0', acc('VEC2', uv));
  prim.setAttribute('COLOR_0', acc('VEC4', col));
  prim.setIndices(acc('SCALAR', idx));
  for (const a of old) if (a.listParents().every((p) => p.propertyType === 'Root')) a.dispose();
}
