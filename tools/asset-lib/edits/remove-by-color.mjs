// removeByVertexColor: delete the triangles of a mesh whose three vertices all match a colour range
// (design: "Ruella hand edits", Requirement 43). The Ruella source has no textures, its colours are COLOR_0
// vertex colours, so the selector reads vertex colours. Idempotent: a second run finds no matching triangle.
import { prune } from '@gltf-transform/functions';
import { EditTargetMissing } from './errors.mjs';
import { findMeshes, readTriangles, rebuildPrimitive } from './geometry.mjs';

/** HSV (h in degrees, s and v in 0..1) of linear or encoded rgb components in 0..1. */
export function rgbToHsv(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = (((g - b) / d) % 6 + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, mx > 0 ? d / mx : 0, mx];
}

/** Hue in the range [lo, hi] degrees; lo > hi wraps through 0 (e.g. [330, 30] is red). */
export function inHueRange(h, [lo, hi]) {
  return lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi;
}

function checkRange(params) {
  const r = params.hueRange;
  if (!Array.isArray(r) || r.length !== 2 || !r.every((x) => Number.isFinite(x) && x >= 0 && x <= 360)) {
    throw new RangeError(`edit removeByVertexColor: hueRange must be [lo, hi] in 0..360, got ${JSON.stringify(r)}`);
  }
  if (params.above !== undefined && (!['x', 'y', 'z'].includes(params.axis) || !Number.isFinite(params.above))) {
    throw new RangeError('edit removeByVertexColor: above needs a finite number and axis x, y or z');
  }
  for (const k of ['minSat', 'minVal']) {
    const v = params[k] ?? 0;
    if (!Number.isFinite(v) || v < 0 || v > 1) throw new RangeError(`edit removeByVertexColor: ${k} must be in [0, 1], got ${v}`);
  }
}

export async function removeByVertexColor(doc, params, ctx = {}) {
  checkRange(params);
  const minSat = params.minSat ?? 0;
  const minVal = params.minVal ?? 0;
  const ax = { x: 0, y: 1, z: 2 }[params.axis];
  const meshes = findMeshes(doc, params.mesh, 'removeByVertexColor', ctx);
  let touched = false;
  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      const col = prim.getAttribute('COLOR_0');
      if (!col) {
        if (ctx.strict) throw new EditTargetMissing({ pick: ctx.pick, op: 'removeByVertexColor', target: `${mesh.getName()}.COLOR_0` });
        continue;
      }
      const n = col.getCount();
      const posArr = prim.getAttribute('POSITION').getArray();
      // Optional region: only vertices beyond bove on xis may be removed; the keep side is never touched.
      const eligible = (i) => params.above === undefined || posArr[i * 3 + ax] >= params.above;
      const match = new Uint8Array(n);
      const c = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        col.getElement(i, c);
        const [h, s, v] = rgbToHsv(c[0], c[1], c[2]);
        if (eligible(i) && s >= minSat && v >= minVal && inHueRange(h, params.hueRange)) match[i] = 1;
      }
      const tris = readTriangles(prim);
      const kept = [];
      for (let t = 0; t < tris.length; t += 3) {
        if (match[tris[t]] && match[tris[t + 1]] && match[tris[t + 2]]) continue;
        kept.push(tris[t], tris[t + 1], tris[t + 2]);
      }
      if (kept.length === tris.length) continue;
      rebuildPrimitive(doc, prim, Uint32Array.from(kept));
      touched = true;
    }
  }
  if (touched) await doc.transform(prune());
  return doc;
}
