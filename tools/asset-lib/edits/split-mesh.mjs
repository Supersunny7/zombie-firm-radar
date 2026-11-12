// splitMesh: divide a named mesh into named part nodes (Requirements 36.7, 37.1-37.3).
//   by: 'components'  connected components of the triangle graph (union-find over shared vertex
//                     indices), numbered by the index of their first triangle (primitive order first).
//   by: 'node'        the mesh primitives are the units; `components` then lists primitive indices.
// Every unit goes to exactly one part; `rest: true` takes the units no other part lists.
// Each part becomes a mesh + node named after the part, added as a child of the node that carried
// the original mesh (identity transform, so every part keeps the original pivot and world position
// and can be animated on its own). The original mesh is disposed and the document pruned.
// Only gltf-transform is used; if the model cannot be split this way a SplitImpossible is thrown.
import { prune } from '@gltf-transform/functions';
import { EditTargetMissing, SplitImpossible } from './errors.mjs';

const TRIANGLES = 4;

function triangleList(prim) {
  const pos = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  const count = indices ? indices.getCount() : pos.getCount();
  const get = indices ? (i) => indices.getScalar(i) : (i) => i;
  const tris = new Uint32Array(count - (count % 3));
  for (let i = 0; i < tris.length; i++) tris[i] = get(i);
  return tris;
}

/** Component id (local to the primitive) per triangle, numbered by first triangle index. */
function componentsOf(tris, vertexCount) {
  const parent = new Int32Array(vertexCount).map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  for (let t = 0; t < tris.length; t += 3) {
    union(tris[t], tris[t + 1]);
    union(tris[t], tris[t + 2]);
  }
  const ids = new Map();
  const perTri = new Int32Array(tris.length / 3);
  for (let t = 0; t < perTri.length; t++) {
    const root = find(tris[t * 3]);
    if (!ids.has(root)) ids.set(root, ids.size);
    perTri[t] = ids.get(root);
  }
  return { perTri, count: ids.size };
}

/** Copy the chosen triangles of `prim` into a new primitive with compacted vertices. */
function extract(doc, prim, tris, triIds) {
  const remap = new Map();
  const used = [];
  for (const t of triIds) for (let k = 0; k < 3; k++) used.push(tris[t * 3 + k]);
  const sorted = [...new Set(used)].sort((a, b) => a - b);
  sorted.forEach((v, i) => remap.set(v, i));
  const out = doc.createPrimitive().setMode(TRIANGLES);
  for (const semantic of prim.listSemantics()) {
    const acc = prim.getAttribute(semantic);
    const size = acc.getElementSize();
    const src = acc.getArray();
    const dst = new src.constructor(sorted.length * size);
    sorted.forEach((v, i) => dst.set(src.subarray(v * size, (v + 1) * size), i * size));
    out.setAttribute(
      semantic,
      doc.createAccessor().setType(acc.getType()).setArray(dst).setNormalized(acc.getNormalized()).setBuffer(acc.getBuffer()),
    );
  }
  const idx = new Uint32Array(used.length);
  used.forEach((v, i) => (idx[i] = remap.get(v)));
  const buffer = prim.getAttribute('POSITION').getBuffer();
  out.setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
  const material = prim.getMaterial();
  if (material) out.setMaterial(material);
  return out;
}

function impossible(ctx, mesh, reason) {
  return new SplitImpossible({ pick: ctx.pick, mesh, reason });
}

export async function splitMesh(doc, params, ctx = {}) {
  const root = doc.getRoot();
  const { mesh: meshName, by, parts } = params;
  const sources = root.listMeshes().filter((m) => m.getName() === meshName);
  if (sources.length === 0) {
    const present = new Set(root.listNodes().map((n) => n.getName()));
    if (parts.every((p) => present.has(p.name))) return doc; // already split
    if (ctx.strict) throw new EditTargetMissing({ pick: ctx.pick, op: 'splitMesh', target: meshName });
    return doc;
  }

  for (const mesh of sources) {
    const prims = mesh.listPrimitives();
    for (const p of prims) {
      if (p.getMode() !== TRIANGLES || !p.getAttribute('POSITION') || p.listTargets().length > 0) {
        throw impossible(ctx, meshName, 'a primitive is not a plain triangle list (points, lines, or morph targets)');
      }
    }

    // Units: component ids (by: components) or primitive indices (by: node), one list of triangles each.
    const primData = prims.map((p) => {
      const tris = triangleList(p);
      return { tris, ...componentsOf(tris, p.getAttribute('POSITION').getCount()) };
    });
    let unitCount;
    const unitTris = []; // unit -> [{ prim, tris: number[] }]
    if (by === 'components') {
      let offset = 0;
      primData.forEach((d, pi) => {
        for (let c = 0; c < d.count; c++) unitTris[offset + c] = [{ prim: pi, tris: [] }];
        d.perTri.forEach((c, t) => unitTris[offset + c][0].tris.push(t));
        offset += d.count;
      });
      unitCount = offset;
    } else {
      primData.forEach((d, pi) => (unitTris[pi] = [{ prim: pi, tris: Array.from({ length: d.perTri.length }, (_, t) => t) }]));
      unitCount = prims.length;
    }

    // Assign units to parts; each unit in exactly one part.
    const owner = new Array(unitCount).fill(-1);
    parts.forEach((p, pi) => {
      for (const u of p.components ?? []) {
        if (!Number.isInteger(u) || u < 0 || u >= unitCount) {
          throw impossible(ctx, meshName, `part "${p.name}" lists ${by === 'components' ? 'component' : 'primitive'} ${u}, but the mesh has only ${unitCount}`);
        }
        if (owner[u] !== -1) throw impossible(ctx, meshName, `${by === 'components' ? 'component' : 'primitive'} ${u} is listed by two parts`);
        owner[u] = pi;
      }
    });
    const restIdx = parts.findIndex((p) => p.rest === true);
    for (let u = 0; u < unitCount; u++) {
      if (owner[u] === -1) {
        if (restIdx === -1) throw impossible(ctx, meshName, `${by === 'components' ? 'component' : 'primitive'} ${u} belongs to no part and no part has rest: true`);
        owner[u] = restIdx;
      }
    }
    const partUnits = parts.map((_, pi) => owner.flatMap((o, u) => (o === pi ? [u] : [])));
    for (const [pi, p] of parts.entries()) {
      if (partUnits[pi].length === 0) throw impossible(ctx, meshName, `part "${p.name}" would be empty`);
    }

    // Build part meshes (one primitive per source primitive that contributes triangles).
    const owners = mesh.listParents().filter((x) => x.propertyType === 'Node');
    const partMeshes = parts.map((p, pi) => {
      const byPrim = new Map();
      for (const u of partUnits[pi]) for (const { prim, tris } of unitTris[u]) byPrim.set(prim, (byPrim.get(prim) ?? []).concat(tris));
      const m = doc.createMesh(p.name);
      for (const prim of [...byPrim.keys()].sort((a, b) => a - b)) {
        m.addPrimitive(extract(doc, prims[prim], primData[prim].tris, byPrim.get(prim).sort((a, b) => a - b)));
      }
      return m;
    });
    for (const node of owners) {
      node.setMesh(null);
      parts.forEach((p, pi) => node.addChild(doc.createNode(p.name).setMesh(partMeshes[pi])));
    }
    mesh.dispose();
  }
  await doc.transform(prune());
  return doc;
}
