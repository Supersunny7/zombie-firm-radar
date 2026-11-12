// Edit framework (design: "Edit operations"). Each op is `async (doc, params, ctx) => doc` with
// ctx = { pick, seed, strict }. In strict mode (the pipeline) a missing target throws
// EditTargetMissing (36.8); in tolerant mode (idempotence tests) it is a no-op.
// Later tasks plug in with `registerEdit` or by adding an entry to OPS: 18.2 (desaturate, darken,
// grime) and 18.3 (splitMesh).
// Only gltf-transform and meshoptimizer are used; no Blender, no other executable (37.1, 37.2).
import { decimate } from './decimate.mjs';
import { EditNotImplemented } from './errors.mjs';
import { joinMeshes } from './join-meshes.mjs';
import { removeByVertexColor } from './remove-by-color.mjs';
import { raggedCut } from './ragged-cut.mjs';
import { removeNode } from './remove-node.mjs';
import { selectVariant } from './select-variant.mjs';
import { splitMesh } from './split-mesh.mjs';
import { darken, desaturate, grime } from './texture-edits.mjs';
import { tint } from './tint.mjs';

export { DecimateUnreachable, EditNotImplemented, EditTargetMissing, SplitImpossible } from './errors.mjs';
export { countTriangles } from './decimate.mjs';

const OPS = new Map([
  ['decimate', decimate],
  ['removeNode', removeNode],
  ['selectVariant', selectVariant],
  ['desaturate', desaturate],
  ['darken', darken],
  ['grime', grime],
  ['splitMesh', splitMesh],
  ['removeByVertexColor', removeByVertexColor],
  ['raggedCut', raggedCut],
  ['tint', tint],
  ['joinMeshes', joinMeshes],
]);

/** Register (or replace) an op implementation; used by the texture and splitMesh modules. */
export function registerEdit(name, fn) {
  OPS.set(name, fn);
}

export function listEdits() {
  return [...OPS.keys()];
}

/**
 * Apply `edits` to `doc` in list order (the order is never sorted). Returns the final document.
 * `pick` (the pick id) is used in error messages.
 */
export async function applyEdits(doc, edits, { pick = null, seed = 0, strict = true } = {}) {
  let current = doc;
  for (const { op, ...params } of edits ?? []) {
    const fn = OPS.get(op);
    if (!fn) throw new EditNotImplemented({ pick, op });
    current = await fn(current, params, { pick, seed, strict });
  }
  return current;
}
