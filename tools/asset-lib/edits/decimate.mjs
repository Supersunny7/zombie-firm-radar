// decimate: reduce the total triangle count to at most `triangles` (Requirement 36.3).
// gltf-transform `simplify` + meshoptimizer only (Requirement 37.1).
import { cloneDocument, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { DecimateUnreachable } from './errors.mjs';

const TRIANGLES = 4;
const TRIANGLE_STRIP = 5;
const TRIANGLE_FAN = 6;

/** Fixed 5-step search; the last step forces lockBorder false and error 0.05 (design). */
export const DECIMATE_STEPS = Object.freeze([
  { error: 0.001, lockBorder: true },
  { error: 0.005, lockBorder: true },
  { error: 0.01, lockBorder: true },
  { error: 0.025, lockBorder: true },
  { error: 0.05, lockBorder: false },
]);

/** Total triangles over all meshes (each mesh counted once, however often it is instanced). */
export function countTriangles(doc) {
  let total = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mode = prim.getMode();
      if (mode !== TRIANGLES && mode !== TRIANGLE_STRIP && mode !== TRIANGLE_FAN) continue;
      const indices = prim.getIndices();
      const position = prim.getAttribute('POSITION');
      const n = indices ? indices.getCount() : position ? position.getCount() : 0;
      total += mode === TRIANGLES ? Math.floor(n / 3) : Math.max(0, n - 2);
    }
  }
  return total;
}

async function runStep(doc, ratio, step) {
  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: step.error, lockBorder: step.lockBorder }));
  return countTriangles(doc);
}

/**
 * The search runs on throw-away clones, so the real document is simplified exactly once with the
 * first step that reaches the target. A model at or below the target is returned unchanged.
 */
export async function decimate(doc, params, ctx = {}) {
  const target = params.triangles;
  const current = countTriangles(doc);
  if (current <= target) return doc;
  await MeshoptSimplifier.ready;
  const ratio = target / current;
  let reached = current;
  for (const step of DECIMATE_STEPS) {
    reached = await runStep(cloneDocument(doc), ratio, step);
    if (reached <= target) {
      await runStep(doc, ratio, step);
      return doc;
    }
  }
  throw new DecimateUnreachable({ pick: ctx.pick, target, reached });
}
