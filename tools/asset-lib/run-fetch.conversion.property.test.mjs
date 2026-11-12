import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fc from 'fast-check';
import { describe, it } from 'vitest';
import { runFetch } from './run-fetch.mjs';
import { makeConverters, makeEnv, makePick } from './test-helpers/fakes.mjs';

async function hashTree(dir, base = dir, out = {}) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await hashTree(p, base, out);
    else out[path.relative(base, p).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(p)).digest('hex');
  }
  return out;
}

const folderOf = { texture: 'textures', model: 'models', audio: 'audio' };

function buildPick(kind, id) {
  if (kind === 'audio') {
    return makePick(id, 'audio', {
      group: 'lab',
      source: { type: 'manual', pageUrl: 'https://freesound.org/s/1/', downloadOption: 'Download original' },
      manual: true,
      expectedFile: `${id}.wav`,
      targetFolder: `tools/cache/manual/${id}`,
    });
  }
  return makePick(id, kind);
}

/** Wraps the good fake converters: failing ids write a partial file (or nothing) and then throw. */
function failingConverters(failModes) {
  const good = makeConverters();
  const blow = async (id, out) => {
    const mode = failModes.get(id);
    if (!mode) return false;
    if (mode === 'partial') await writeFile(path.join(out, `${id}.partial`), 'half-written');
    throw new Error(`boom-${id}`);
  };
  return {
    ...good,
    texture: async (pick, inputs, out) => (await blow(pick.id, out), good.texture(pick, inputs, out)),
    model: async (pick, input, out) => (await blow(pick.id, out), good.model(pick, input, out)),
    audio: async (args) => (await blow(args.name, args.outDir), good.audio(args)),
  };
}

const kindsArb = fc.array(fc.constantFrom('texture', 'model', 'audio'), { minLength: 1, maxLength: 5 });

describe('runFetch conversion failures', () => {
  // Feature: asset-pipeline, Property 11: Conversion failure leaves no partial output
  // **Validates: Requirements 16.9**
  it('failed picks leave no partial output, others are written, exit code is 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        kindsArb,
        fc.array(fc.constantFrom('ok', 'throw', 'partial'), { minLength: 5, maxLength: 5 }),
        fc.boolean(),
        async (kinds, modesRaw, withPrevious) => {
          const picks = kinds.map((k, i) => buildPick(k, `p${i}-${k}`));
          const failModes = new Map();
          picks.forEach((p, i) => {
            if (modesRaw[i] !== 'ok') failModes.set(p.id, modesRaw[i]);
          });
          const { env, roots } = await makeEnv();
          try {
            for (const p of picks.filter((x) => x.manual)) {
              const dir = path.join(roots.cacheRoot, 'manual', p.id);
              await mkdir(dir, { recursive: true });
              await writeFile(path.join(dir, p.expectedFile), `wav-${p.id}`);
            }
            if (withPrevious) {
              const first = await runFetch({ picks, env });
              if (first.failed.length) throw new Error(`setup run failed: ${JSON.stringify(first.failed)}`);
            }
            const before = await hashTree(roots.assetRoot);
            // A changed recipe forces reconversion on the second run.
            const env2 = { ...env, convert: failingConverters(failModes), recipeVersions: { test: '2' } };
            const res = await runFetch({ picks, env: env2 });
            const after = await hashTree(roots.assetRoot);
            const failIds = [...failModes.keys()];

            if (res.exitCode !== (failIds.length > 0 ? 1 : 0)) throw new Error(`exit code ${res.exitCode}`);
            if (res.failed.length !== failIds.length) throw new Error(`failed list ${JSON.stringify(res.failed)}`);
            for (const id of failIds) {
              const f = res.failed.find((x) => x.name === id);
              if (!f || !f.cause.includes(`boom-${id}`)) throw new Error(`error not reported for ${id}`);
              const prefix = `${folderOf[picks.find((p) => p.id === id).kind]}/${id}/`;
              const keys = (t) => Object.entries(t).filter(([k]) => k.startsWith(prefix));
              if (JSON.stringify(keys(after)) !== JSON.stringify(keys(before))) throw new Error(`output of ${id} changed`);
              if (!withPrevious && keys(after).length !== 0) throw new Error(`partial output for ${id}`);
              if (Object.keys(after).some((k) => k.endsWith('.partial'))) throw new Error('partial file leaked');
              if (res.written.some((w) => w.startsWith(prefix))) throw new Error(`${id} reported written`);
            }
            const work = await readdir(path.join(roots.cacheRoot, 'work')).catch(() => []);
            if (work.length !== 0) throw new Error(`work folders remain: ${work}`);
            for (const p of picks.filter((x) => !failModes.has(x.id))) {
              const prefix = `${folderOf[p.kind]}/${p.id}/`;
              if (!Object.keys(after).some((k) => k.startsWith(prefix))) throw new Error(`${p.id} not written`);
            }
          } finally {
            await rm(roots.repoRoot, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 30 },
    );
  }, 240000);
});
