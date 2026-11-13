// Converted character models: Meshopt decode, skeleton size, no spec-gloss, clips, in-place walk.
// Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 13.5. A missing glb skips its tests with a message.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { describe, expect, it } from 'vitest';
import { skeletonReport } from './skeleton-report.mjs';

const MODELS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/public/assets/models');
const WALKER_CLIPS = ['Idle', 'Walk1_InPlace', 'Attack', 'FallingForward'];
const MIN_BONES = 15;
const SPEC_GLOSS = 'KHR_materials_pbrSpecularGlossiness';

const CHARACTERS = [
  { slug: 'sketchfab-possessed-undead-giantswing', clips: [] },
  { slug: 'sketchfab-zombie-pxltiger', clips: WALKER_CLIPS },
  { slug: 'sketchfab-zombie-walk-oscar', clips: [] },
  { slug: 'sketchfab-hooded-horror-woman-purplepoint', clips: [] },
];

async function readDoc(file) {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  return io.read(file);
}

/** Largest horizontal translation excursion (metres, world scale applied) of the root-most joints in a clip. */
function rootTranslationExtent(doc, clipName) {
  const joints = new Set();
  for (const skin of doc.getRoot().listSkins()) for (const j of skin.listJoints()) joints.add(j);
  const anim = doc.getRoot().listAnimations().find((a) => a.getName() === clipName);
  let worst = 0;
  for (const ch of anim.listChannels()) {
    if (ch.getTargetPath() !== 'translation') continue;
    const node = ch.getTargetNode();
    if (!joints.has(node)) continue;
    // Root-most joints: no joint ancestor, or only the single wrapper root above.
    let depth = 0;
    for (let p = node.getParentNode(); p; p = p.getParentNode()) if (joints.has(p)) depth++;
    if (depth > 1) continue;
    const scale = node.getParentNode() ? node.getParentNode().getWorldScale() : [1, 1, 1];
    const out = ch.getSampler().getOutput();
    const first = out.getElement(0, []);
    const cur = [0, 0, 0];
    for (let i = 1; i < out.getCount(); i++) {
      out.getElement(i, cur);
      // Horizontal travel only (X and Z): the pelvis bobs ~2 cm vertically in a walk cycle,
      // which is not root motion. Feet must not slide, so ground-plane travel must be ~0.
      const d = Math.hypot((cur[0] - first[0]) * scale[0], (cur[2] - first[2]) * scale[2]);
      if (d > worst) worst = d;
    }
  }
  return worst;
}

describe.each(CHARACTERS)('character model $slug', ({ slug, clips }) => {
  const file = path.join(MODELS, slug, `${slug}.glb`);
  const present = existsSync(file);
  if (!present) console.warn(`SKIP ${slug}: ${file} is absent (run fetch-assets first)`);
  const it_ = present ? it : it.skip;

  it_('loads with the Meshopt decoder and has a skinned mesh with enough bones', async () => {
    const doc = await readDoc(file);
    const skinnedMeshes = doc
      .getRoot()
      .listNodes()
      .filter((n) => n.getMesh() && n.getSkin());
    expect(skinnedMeshes.length).toBeGreaterThan(0);
    const report = await skeletonReport(file);
    const largest = Math.max(...doc.getRoot().listSkins().map((s) => s.listJoints().length));
    // pxltiger has many skins; the combined count is the documented fallback for the 15-bone rule.
    expect(Math.max(largest, report.jointCount)).toBeGreaterThanOrEqual(MIN_BONES);
  });

  it_('does not use KHR_materials_pbrSpecularGlossiness', async () => {
    const doc = await readDoc(file);
    const names = doc
      .getRoot()
      .listExtensionsUsed()
      .map((e) => e.extensionName);
    expect(names).not.toContain(SPEC_GLOSS);
  });

  it_(`has ${clips.length === 0 ? 'no' : 'exactly the four'} animation clips`, async () => {
    const report = await skeletonReport(file);
    expect(report.clips.map((c) => c.name).sort()).toEqual([...clips].sort());
  });
});

describe('Walker Walk1_InPlace', () => {
  const slug = 'sketchfab-zombie-pxltiger';
  const file = path.join(MODELS, slug, `${slug}.glb`);
  const it_ = existsSync(file) ? it : it.skip;
  it_('root translation stays below 1 cm', async () => {
    const doc = await readDoc(file);
    expect(rootTranslationExtent(doc, 'Walk1_InPlace')).toBeLessThan(0.01);
  });
});
