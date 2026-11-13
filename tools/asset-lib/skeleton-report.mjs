// skeletonReport(glbPath): read a converted GLB (Meshopt allowed) and summarise what the
// graveyard needs to know about a character: skins, joints, animation clips, triangles and
// texture bytes. Read-only.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { collectJointNames } from './bip01.mjs';
import { countTriangles } from './edits/decimate.mjs';

/** Clip length in seconds: the largest keyframe time over its samplers. */
function clipDuration(anim) {
  let max = 0;
  for (const sampler of anim.listSamplers()) {
    const input = sampler.getInput();
    if (!input) continue;
    const count = input.getCount();
    if (count === 0) continue;
    const t = input.getScalar(count - 1);
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max;
}

/**
 * @param {string} glbPath
 * @returns {Promise<{ skins: number, jointCount: number, jointNames: string[],
 *   clips: { name: string, duration: number }[], triangles: number, textureBytes: number }>}
 */
export async function skeletonReport(glbPath) {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(glbPath);
  const root = doc.getRoot();
  const jointNames = collectJointNames(doc);
  let textureBytes = 0;
  for (const tex of root.listTextures()) textureBytes += tex.getImage()?.byteLength ?? 0;
  return {
    skins: root.listSkins().length,
    jointCount: jointNames.length,
    jointNames,
    clips: root.listAnimations().map((a) => ({ name: a.getName(), duration: clipDuration(a) })),
    triangles: countTriangles(doc),
    textureBytes,
  };
}
