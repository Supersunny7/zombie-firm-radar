// joinMeshes: merge the single primitive of several meshes into the first one (design: "Ruella hand edits",
// Requirement 43). The Ruella skin is one surface split into two meshes (Object_5, Object_6) that share a
// seam of open edges. Decimated separately, each side of the seam moves on its own and pinholes open along
// it. Joined into one primitive, meshoptimizer sees the seam as shared positions and keeps it closed.
// All listed meshes must use the same material, the same attribute set and the same world transform.
// Idempotent: after the join the other meshes no longer exist, so a second run has nothing to merge.
import { prune } from '@gltf-transform/functions';
import { findMeshes, readTriangles, rebuildPrimitive } from './geometry.mjs';

function check(params) {
  if (!Array.isArray(params.meshes) || params.meshes.length < 2 || !params.meshes.every((m) => typeof m === 'string')) {
    throw new RangeError(`edit joinMeshes: meshes must list at least two mesh names, got ${JSON.stringify(params.meshes)}`);
  }
}

const sameMatrix = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);

export async function joinMeshes(doc, params, ctx = {}) {
  check(params);
  const found = params.meshes.map((name) => findMeshes(doc, name, 'joinMeshes', ctx)[0]).filter(Boolean);
  if (found.length < 2) return doc; // already joined (or tolerant mode with missing targets)
  const [target, ...rest] = found;
  const prims = found.map((m) => m.listPrimitives());
  if (prims.some((p) => p.length !== 1)) throw new RangeError('edit joinMeshes: every mesh must have exactly one primitive');
  const base = prims[0][0];
  const sems = base.listSemantics().sort().join(',');
  const nodeOf = (m) => m.listParents().find((p) => p.propertyType === 'Node');
  const baseMatrix = nodeOf(target)?.getWorldMatrix() ?? [];
  for (const m of rest) {
    const p = m.listPrimitives()[0];
    if (p.getMaterial() !== base.getMaterial()) throw new RangeError(`edit joinMeshes: ${m.getName()} uses a different material`);
    if (p.listSemantics().sort().join(',') !== sems) throw new RangeError(`edit joinMeshes: ${m.getName()} has different attributes`);
    if (!sameMatrix(nodeOf(m)?.getWorldMatrix() ?? [], baseMatrix)) throw new RangeError(`edit joinMeshes: ${m.getName()} has a different transform`);
  }
  // Append the other primitives' vertices as "extra" vertices of the base primitive.
  const tris = Array.from(readTriangles(base));
  const extras = [];
  let next = base.getAttribute('POSITION').getCount();
  for (const m of rest) {
    const p = m.listPrimitives()[0];
    const n = p.getAttribute('POSITION').getCount();
    // Raw components (no normalisation round trip); the component type must match the base accessor.
    const arrays = p.listSemantics().map((s) => {
      const acc = p.getAttribute(s);
      const ref = base.getAttribute(s);
      if (acc.getArray().constructor !== ref.getArray().constructor || acc.getNormalized() !== ref.getNormalized()) {
        throw new RangeError(`edit joinMeshes: ${m.getName()}.${s} has a different component type`);
      }
      return [s, acc.getArray(), acc.getElementSize()];
    });
    for (let i = 0; i < n; i++) {
      const v = {};
      for (const [s, arr, size] of arrays) v[s] = Array.from(arr.subarray(i * size, i * size + size));
      extras.push(v);
    }
    for (const t of readTriangles(p)) tris.push(t + next);
    next += n;
  }
  rebuildPrimitive(doc, base, Uint32Array.from(tris), extras);
  for (const m of rest) {
    for (const node of m.listParents().filter((p) => p.propertyType === 'Node')) node.dispose();
    m.dispose();
  }
  await doc.transform(prune());
  return doc;
}
