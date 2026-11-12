// raggedCut: trim a mesh along a seeded jagged boundary and close the opening with a fan cap
// (design: "Ruella hand edits", Requirement 43). The cut position along `axis` varies with the angle around
// the axis (seeded periodic noise), so the stump looks torn instead of sliced. Every new open edge is
// capped, so no hole shows inside. Idempotent through a marker in the mesh extras.
import { prune } from '@gltf-transform/functions';
import { boundaryEdges, findMeshes, readTriangles, rebuildPrimitive, wkey } from './geometry.mjs';
import { mulberry32 } from './texture-edits.mjs';

const AXES = { x: 0, y: 1, z: 2 };

function check(params) {
  if (!(params.axis in AXES)) throw new RangeError(`edit raggedCut: axis must be x, y or z, got ${params.axis}`);
  const num = (name, v, lo, hi) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
      throw new RangeError(`edit raggedCut: ${name} must be a number in [${lo}, ${hi}], got ${v}`);
    }
  };
  num('at', params.at, 0, 1);
  num('amplitude', params.amplitude, 0, 0.5);
  num('seed', params.seed, -2147483648, 4294967295);
  if (params.keep !== undefined && params.keep !== 'below' && params.keep !== 'above') {
    throw new RangeError(`edit raggedCut: keep must be "below" or "above", got ${params.keep}`);
  }
}

/** Seeded periodic value noise in [-1, 1] over an angle in radians. */
function angularNoise(seed) {
  const rnd = mulberry32(seed);
  const octave = (k) => {
    const lat = Array.from({ length: k }, () => rnd());
    return (theta) => {
      const f = ((theta / (2 * Math.PI)) % 1 + 1) % 1 * k;
      const i = Math.floor(f);
      const t = f - i;
      const s = t * t * (3 - 2 * t);
      return lat[i % k] * (1 - s) + lat[(i + 1) % k] * s;
    };
  };
  const a = octave(7);
  const b = octave(19);
  const c = octave(41); // fine teeth
  return (theta) => 0.5 * (2 * a(theta) - 1) + 0.3 * (2 * b(theta) - 1) + 0.2 * (2 * c(theta) - 1);
}

export async function raggedCut(doc, params, ctx = {}) {
  check(params);
  const ax = AXES[params.axis];
  const [u, w] = [(ax + 1) % 3, (ax + 2) % 3];
  const keepBelow = (params.keep ?? 'below') === 'below';
  const key = `${params.axis}:${params.at}:${params.seed}:${params.amplitude}:${keepBelow ? 'below' : 'above'}`;
  const meshes = findMeshes(doc, params.mesh, 'raggedCut', ctx).filter((m) => m.getExtras()?.raggedCut !== key);
  if (meshes.length === 0) return doc;

  // Joint geometry of all target meshes so that two parts of one limb get the same cut.
  let lo = Infinity;
  let hi = -Infinity;
  for (const m of meshes) {
    for (const p of m.listPrimitives()) {
      const pos = p.getAttribute('POSITION');
      const arr = pos.getArray();
      for (let i = 0; i < pos.getCount(); i++) {
        lo = Math.min(lo, arr[i * 3 + ax]);
        hi = Math.max(hi, arr[i * 3 + ax]);
      }
    }
  }
  if (!Number.isFinite(lo)) return doc;
  const x0 = lo + params.at * (hi - lo);
  const bandHalf = 0.08 * (hi - lo);
  const bmin = [Infinity, Infinity];
  const bmax = [-Infinity, -Infinity];
  for (const m of meshes) {
    for (const p of m.listPrimitives()) {
      const arr = p.getAttribute('POSITION').getArray();
      for (let i = 0; i < arr.length / 3; i++) {
        if (Math.abs(arr[i * 3 + ax] - x0) > bandHalf) continue;
        bmin[0] = Math.min(bmin[0], arr[i * 3 + u]);
        bmax[0] = Math.max(bmax[0], arr[i * 3 + u]);
        bmin[1] = Math.min(bmin[1], arr[i * 3 + w]);
        bmax[1] = Math.max(bmax[1], arr[i * 3 + w]);
      }
    }
  }
  if (!Number.isFinite(bmin[0])) return doc;
  const cu = (bmin[0] + bmax[0]) / 2;
  const cw = (bmin[1] + bmax[1]) / 2;
  const amp = params.amplitude * Math.max(bmax[0] - bmin[0], bmax[1] - bmin[1]);
  const noise = angularNoise(params.seed);
  const cutAt = (arr, i) => x0 + amp * noise(Math.atan2(arr[i * 3 + w] - cw, arr[i * 3 + u] - cu));
  const sign = keepBelow ? 1 : -1;
  const normal = [0, 0, 0];
  normal[ax] = sign;

  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION').getArray();
      const count = pos.length / 3;
      const keepV = new Uint8Array(count);
      for (let i = 0; i < count; i++) {
        const c = cutAt(pos, i);
        keepV[i] = (keepBelow ? pos[i * 3 + ax] <= c : pos[i * 3 + ax] >= c) ? 1 : 0;
      }
      const tris = readTriangles(prim);
      const kept = [];
      for (let t = 0; t < tris.length; t += 3) {
        if (keepV[tris[t]] && keepV[tris[t + 1]] && keepV[tris[t + 2]]) kept.push(tris[t], tris[t + 1], tris[t + 2]);
      }
      if (kept.length === tris.length) continue;

      // New open edges only (pre-existing seams are left alone), welded by position.
      const before = boundaryEdges(prim, tris);
      const after = boundaryEdges(prim, Uint32Array.from(kept));
      const fresh = [...after].filter(([k]) => !before.has(k)).map(([, e]) => e);
      // Group the fresh edges into loops with union-find over welded vertex keys.
      const parent = new Map();
      const find = (k) => {
        while (parent.get(k) !== k) {
          parent.set(k, parent.get(parent.get(k)));
          k = parent.get(k);
        }
        return k;
      };
      for (const [a, b] of fresh) {
        const ka = wkey(pos, a);
        const kb = wkey(pos, b);
        if (!parent.has(ka)) parent.set(ka, ka);
        if (!parent.has(kb)) parent.set(kb, kb);
        parent.set(find(ka), find(kb));
      }
      const comps = new Map(); // root key -> { verts: Map<wkey, vertexIndex> }
      for (const [a, b] of fresh) {
        for (const v of [a, b]) {
          const root = find(wkey(pos, v));
          if (!comps.has(root)) comps.set(root, new Map());
          comps.get(root).set(wkey(pos, v), v);
        }
      }
      const roots = [...comps.keys()].sort();
      const semantics = prim.listSemantics();
      const extras = roots.map((root) => {
        const verts = [...comps.get(root).values()];
        const out = {};
        for (const sem of semantics) {
          const acc = prim.getAttribute(sem);
          const size = acc.getElementSize();
          const src = acc.getArray();
          const mean = new Array(size).fill(0);
          for (const v of verts) for (let c = 0; c < size; c++) mean[c] += src[v * size + c] / verts.length;
          out[sem] = sem === 'NORMAL' ? normal : sem.startsWith('TEXCOORD') ? new Array(size).fill(0) : mean;
        }
        return out;
      });
      const rootIndex = new Map(roots.map((r, i) => [r, count + i]));
      for (const [a, b] of fresh) {
        // The kept triangle holds a -> b; the cap holds b -> a, so every edge is shared by two triangles.
        kept.push(b, a, rootIndex.get(find(wkey(pos, a))));
      }
      rebuildPrimitive(doc, prim, Uint32Array.from(kept), extras);
    }
    if (!mesh.isDisposed()) mesh.setExtras({ ...(mesh.getExtras() ?? {}), raggedCut: key });
  }
  await doc.transform(prune());
  return doc;
}
