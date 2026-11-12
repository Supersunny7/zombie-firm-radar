// Model / avatar / animation converter (design: "Conversion pipeline", Requirements 16.1, 16.5,
// 16.8, 16.9, 18.5, 34.3-34.5, 37). FBX goes through the fbx2gltf npm package (its bundled
// FBX2glTF executable only; no Blender, no system converter). Then, in this order:
// Edit_List, dedup, prune, resample (avatars and animations only), textureCompress (WebP, 1024),
// meshopt. Output is one self-contained GLB. Writes only into the given work folder.
import { createRequire } from 'node:module';
import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { bip01Message, checkBip01, collectJointNames } from './bip01.mjs';
import { LIMIT_DEFAULT, WARN_BYTES } from './convert-texture.mjs';
import { applyEdits } from './edits/index.mjs';

export const MESHOPT_LEVEL = 'medium';
export const LICENSE_FILE_NAME = 'LICENSE';
export const LICENSE_TITLE = 'Microsoft Rocketbox LICENSE';

const require = createRequire(import.meta.url);

/** Default FBX step: the fbx2gltf npm package (bundled FBX2glTF.exe). Loaded lazily. */
export async function convertFbxWithPackage(src, dest, args = ['--binary']) {
  const fbx2gltf = require('fbx2gltf');
  return fbx2gltf(src, dest, [...args]);
}

/** True for Rocketbox picks (credit title, author or URL mentions Rocketbox). Pure. */
export function isRocketbox(pick) {
  const c = pick?.credits ?? {};
  return /rocketbox/i.test(`${c.title ?? ''} ${c.author ?? ''} ${c.sourceUrl ?? ''}`);
}

/** Size warning with a model suggestion for files over 5 MB (Requirement 17.5). Pure. */
export function modelSizeWarning(fileName, bytes) {
  if (bytes <= WARN_BYTES) return null;
  const mb = (bytes / 1_048_576).toFixed(2);
  return `${fileName} is ${mb} MB (over 5 MB). Suggestion: decimate the mesh with an Edit_List entry, or lower the texture limit.`;
}

/** Joint names of the skins, or animated node names when the file has no skin. */
function skeletonNames(doc) {
  const joints = collectJointNames(doc);
  if (joints.length > 0) return joints;
  const names = new Set();
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode();
      if (node) names.add(node.getName());
    }
  }
  return [...names];
}

async function createIO() {
  await MeshoptEncoder.ready;
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
}

/**
 * Convert one model, avatar or animation pick into `workDir`.
 * pick: { id, kind: 'model'|'avatar'|'animation', edits?, credits? }
 * input: { path (.fbx, .glb or .gltf), licensePath? (Rocketbox LICENSE to copy beside avatars) }
 * options: { convertFbx?, seed? } (convertFbx is injectable for tests)
 * Returns { files: [{ fileName, path, bytes, kind: 'model'|'license', title? }], warnings, bip01 }.
 * On any failure everything this call created is removed (Requirement 16.9).
 */
export async function convertModel(pick, input, workDir, options = {}) {
  const { convertFbx = convertFbxWithPackage, seed = 0 } = options;
  if (typeof pick?.id !== 'string' || pick.id === '') throw new Error('convertModel: pick.id is required');
  if (!['model', 'avatar', 'animation'].includes(pick.kind)) {
    throw new Error(`convertModel: ${pick.id}: unsupported kind ${JSON.stringify(pick.kind)}`);
  }
  if (typeof input?.path !== 'string') throw new Error(`convertModel: ${pick.id}: input.path is required`);
  const ext = path.extname(input.path).toLowerCase();
  if (!['.fbx', '.glb', '.gltf'].includes(ext)) {
    throw new Error(`convertModel: ${pick.id}: unsupported source type ${ext || '(none)'}`);
  }
  const rocketbox = isRocketbox(pick) && (pick.kind === 'avatar' || pick.kind === 'animation');
  const wantLicense = isRocketbox(pick) && pick.kind === 'avatar';
  if (wantLicense && !input.licensePath) {
    throw new Error(`convertModel: ${pick.id}: Rocketbox avatar needs the repository LICENSE file (input.licensePath)`);
  }

  await mkdir(workDir, { recursive: true });
  const outName = `${pick.id}.glb`;
  const outPath = path.join(workDir, outName);
  const tmpOut = `${outPath}.tmp`;
  const tmpFbx = path.join(workDir, `${pick.id}.fbx2gltf.tmp.glb`);
  const licensePath = path.join(workDir, LICENSE_FILE_NAME);
  const created = [tmpOut, tmpFbx];

  try {
    const io = await createIO();
    let readPath = input.path;
    if (ext === '.fbx') {
      await convertFbx(input.path, tmpFbx, ['--binary']);
      readPath = tmpFbx;
    }
    const doc = await io.read(readPath);

    let bip01 = false;
    if (rocketbox) {
      // Animation-only GLBs may have no skin; then the animated nodes are checked instead.
      const result = checkBip01(skeletonNames(doc));
      if (!result.ok) throw new Error(bip01Message(pick.id, result.offending, result.expected));
      bip01 = true;
    }

    await applyEdits(doc, pick.edits ?? [], { pick: pick.id, seed, strict: true });

    const steps = [dedup(), prune()];
    if (pick.kind !== 'model') steps.push(resample());
    steps.push(
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [LIMIT_DEFAULT, LIMIT_DEFAULT] }),
      meshopt({ encoder: MeshoptEncoder, level: MESHOPT_LEVEL }),
    );
    await doc.transform(...steps);

    await io.write(tmpOut, doc);
    await rename(tmpOut, outPath);
    created.push(outPath);
    await rm(tmpFbx, { force: true });

    const files = [];
    const glbBytes = (await stat(outPath)).size;
    files.push({ fileName: outName, path: outPath, bytes: glbBytes, kind: 'model' });

    if (wantLicense) {
      await copyFile(input.licensePath, licensePath);
      created.push(licensePath);
      files.push({
        fileName: LICENSE_FILE_NAME,
        path: licensePath,
        bytes: (await stat(licensePath)).size,
        kind: 'license',
        title: LICENSE_TITLE,
      });
    }
    const warnings = files.map((f) => modelSizeWarning(f.fileName, f.bytes)).filter(Boolean);
    return { files, warnings, bip01 };
  } catch (error) {
    await Promise.all(created.map((p) => rm(p, { force: true })));
    throw error;
  }
}

/** Read a GLB and return its extensionsUsed list (helper for tests and the audit). */
export async function readExtensionsUsed(glbPath) {
  const { json } = await new NodeIO().readAsJSON(glbPath);
  return json.extensionsUsed ?? [];
}
