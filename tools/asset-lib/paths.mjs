// Repo roots, safe join and output path planning (design: "Ownership and git safety").
// planOutputs and safeJoin are pure.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(here, '..', '..');
export const ASSET_ROOT = path.join(REPO_ROOT, 'web', 'public', 'assets');
export const CACHE_ROOT = path.join(REPO_ROOT, 'tools', 'cache');
export const CREDITS_FILE = path.join(REPO_ROOT, 'CREDITS.md');
export const MANUAL_README = path.join(CACHE_ROOT, 'manual', 'README.md');

/** Kind -> output folder under the asset root. */
export const KIND_FOLDERS = {
  texture: 'textures',
  hdri: 'hdri',
  model: 'models',
  avatar: 'avatars',
  animation: 'animations',
  audio: 'audio',
};

/**
 * Join parts under root; throws if the result escapes root.
 * Rejects absolute parts, drive letters and `..` traversal.
 */
export function safeJoin(root, ...parts) {
  const base = path.resolve(root);
  for (const part of parts) {
    if (typeof part !== 'string' || part === '' || part.includes('\0')) {
      throw new Error(`safeJoin: invalid path part ${JSON.stringify(part)}`);
    }
  }
  const resolved = path.resolve(base, ...parts);
  const rel = path.relative(base, resolved);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`safeJoin: path escapes root: ${parts.join('/')}`);
  }
  return resolved;
}

/**
 * Plan output paths for the files a converter produced.
 * ProducedFile: { fileName: string, bytes?: number | Uint8Array, ... } (extra keys are kept).
 * Returns PlannedOutput: ProducedFile & { relPath }, relPath uses `/` and is relative to the asset root:
 * `<kindFolder>/<pick.id>/<fileName>`.
 */
export function planOutputs(pick, produced) {
  const folder = KIND_FOLDERS[pick?.kind];
  if (!folder) throw new Error(`planOutputs: unknown kind ${JSON.stringify(pick?.kind)}`);
  const id = pick.id ?? pick.name;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`planOutputs: invalid pick id ${JSON.stringify(id)}`);
  }
  return produced.map((file) => {
    const fileName = file.fileName;
    if (typeof fileName !== 'string' || fileName === '' || /[\\/]/.test(fileName)) {
      throw new Error(`planOutputs: invalid file name ${JSON.stringify(fileName)} for ${id}`);
    }
    // Throws if the name would escape the asset root.
    safeJoin(ASSET_ROOT, folder, id, fileName);
    return { ...file, relPath: `${folder}/${id}/${fileName}` };
  });
}
