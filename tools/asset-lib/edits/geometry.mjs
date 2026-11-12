// Shared triangle-soup helpers for the geometry edits (removeByVertexColor, raggedCut).
// Primitives are rebuilt from a triangle list; unused vertices are dropped and extra vertices
// (cap centres) can be appended. Pure JavaScript on gltf-transform accessors; no other tools.
import { EditTargetMissing } from './errors.mjs';

/** Triangle index list of a TRIANGLES primitive (non-indexed primitives get an implicit 0..n-1 list). */
export function readTriangles(prim) {
  const idx = prim.getIndices();
  if (idx) return Uint32Array.from(idx.getArray());
  const n = prim.getAttribute('POSITION').getCount();
  return Uint32Array.from({ length: n }, (_, i) => i);
}

/** Meshes with the given name, or every mesh when `name` is undefined. Missing -> typed error in strict mode. */
export function findMeshes(doc, name, op, ctx) {
  const all = doc.getRoot().listMeshes();
  const found = name === undefined ? all : all.filter((m) => m.getName() === name);
  if (found.length === 0 && name !== undefined && ctx.strict) {
    throw new EditTargetMissing({ pick: ctx.pick, op, target: name });
  }
  return found;
}

/** Position key shared by split vertices (same place, different normal/colour). */
const wkey = (pos, i) => `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`;

/** Set of welded directed-edge-count keys with count 1 (open edges), as Map key -> [a, b] first directed edge seen. */
export function boundaryEdges(prim, tris = readTriangles(prim)) {
  const pos = prim.getAttribute('POSITION').getArray();
  const counts = new Map();
  const first = new Map();
  for (let t = 0; t < tris.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tris[t + e];
      const b = tris[t + ((e + 1) % 3)];
      const ka = wkey(pos, a);
      const kb = wkey(pos, b);
      if (ka === kb) continue; // degenerate after welding
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!first.has(key)) first.set(key, [a, b]);
    }
  }
  const open = new Map();
  for (const [key, n] of counts) if (n === 1) open.set(key, first.get(key));
  return open;
}

/** Number of open (boundary) welded edges of a primitive; 0 means closed. */
export function countOpenEdges(prim) {
  return boundaryEdges(prim).size;
}

export { wkey };

/**
 * Replace the triangles of `prim`. `tris` indexes the current vertices plus `extras.length` new ones
 * (indices >= old vertex count). `extras[k]` maps a semantic to an array of its components.
 * Unused vertices are dropped. Returns false (and disposes the primitive) when no triangle is left.
 */
export function rebuildPrimitive(doc, prim, tris, extras = []) {
  const mesh = prim.listParents().find((p) => p.propertyType === 'Mesh');
  if (tris.length === 0) {
    prim.dispose();
    if (mesh && mesh.listPrimitives().length === 0) mesh.dispose();
    return false;
  }
  const semantics = prim.listSemantics();
  const oldCount = prim.getAttribute('POSITION').getCount();
  const map = new Int32Array(oldCount + extras.length).fill(-1);
  const order = [];
  for (const v of tris) {
    if (map[v] === -1) {
      map[v] = order.length;
      order.push(v);
    }
  }
  const buffer = doc.getRoot().listBuffers()[0] ?? null;
  for (const sem of semantics) {
    const acc = prim.getAttribute(sem);
    const size = acc.getElementSize();
    const src = acc.getArray();
    const out = new src.constructor(order.length * size);
    for (let k = 0; k < order.length; k++) {
      const v = order[k];
      if (v < oldCount) {
        for (let c = 0; c < size; c++) out[k * size + c] = src[v * size + c];
      } else {
        const vals = extras[v - oldCount][sem] ?? [];
        for (let c = 0; c < size; c++) out[k * size + c] = vals[c] ?? 0;
      }
    }
    const next = doc
      .createAccessor()
      .setType(acc.getType())
      .setArray(out)
      .setNormalized(acc.getNormalized());
    if (buffer) next.setBuffer(buffer);
    prim.setAttribute(sem, next);
  }
  const indexArray = Uint32Array.from(tris, (v) => map[v]);
  const idx = doc.createAccessor().setType('SCALAR').setArray(indexArray);
  if (buffer) idx.setBuffer(buffer);
  prim.setIndices(idx);
  return true;
}

/** True when a position of a vertex array is finite; used to ignore broken input. */
export function vec3(arr, i) {
  return [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];
}
