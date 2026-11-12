import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fc from 'fast-check';
import { describe, it } from 'vitest';
import { applyPrune, isEmptyPlan, planPrune, pruneManifest } from './prune.mjs';

const TYPE_DIRS = ['textures', 'hdri', 'models', 'avatars', 'animations', 'audio'];

async function listAll(root, rel = '', out = {}) {
  for (const e of await readdir(path.join(root, rel), { withFileTypes: true }).catch(() => [])) {
    const r = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) await listAll(root, r, out);
    else out[r] = await readFile(path.join(root, r), 'utf8');
  }
  return out;
}

const idArb = fc.constantFrom('a1', 'b2', 'c3', 'd4');
const fileArb = fc.record({
  typeDir: fc.constantFrom(...TYPE_DIRS),
  id: idArb,
  name: fc.constantFrom('x.glb', 'LICENSE', 'y.webp', 'stray.txt'),
  listed: fc.boolean(),
});

describe('prune', () => {
  // Feature: asset-pipeline, Property: prune scope
  // **Validates: Requirements 45.2, 45.3, 45.4, 45.7**
  it('deletes only listed files inside removed ids folders, and a second plan is empty', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fileArb, { maxLength: 14 }), fc.uniqueArray(idArb, { maxLength: 4 }), async (files, removed) => {
        const root = await mkdtemp(path.join(os.tmpdir(), 'prune-prop-'));
        try {
          const manifest = { version: 1, files: {} };
          for (const f of files) {
            const rel = `${f.typeDir}/${f.id}/${f.name}`;
            await mkdir(path.join(root, f.typeDir, f.id), { recursive: true });
            await writeFile(path.join(root, rel), `content:${rel}`);
            if (f.listed) manifest.files[rel] = {};
          }
          await writeFile(path.join(root, 'manifest.json'), '{}');
          const picks = ['a1', 'b2', 'c3', 'd4'].filter((i) => !removed.includes(i)).map((id) => ({ id }));
          const before = await listAll(root);

          const plan = planPrune({ picks, manifest, credits: [], assetRoot: root });
          const res = await applyPrune(plan, { assetRoot: root });
          const after = await listAll(root);

          const deleted = Object.keys(before).filter((k) => !(k in after));
          for (const k of deleted) {
            const [, id] = k.split('/');
            if (!removed.includes(id) || !(k in manifest.files)) return false;
          }
          for (const k of Object.keys(after)) if (after[k] !== before[k]) return false;
          // every listed file of a removed id is gone
          for (const k of Object.keys(manifest.files)) {
            if (removed.includes(k.split('/')[1]) && k in after) return false;
          }
          if (res.errors.length > 0) return false;

          const next = pruneManifest({ version: 1, files: manifest.files }, plan.manifestKeys);
          return isEmptyPlan(planPrune({ picks, manifest: next, credits: [], assetRoot: root }));
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }),
      { numRuns: 100 },
    );
  }, 300000);
});
