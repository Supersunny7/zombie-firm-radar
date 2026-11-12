import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fc from 'fast-check';
import { describe, it } from 'vitest';
import { runFetch } from './run-fetch.mjs';
import { makeEnv, makePick } from './test-helpers/fakes.mjs';

async function hashTree(dir, base = dir, out = {}) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await hashTree(p, base, out);
    else out[path.relative(base, p).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(p)).digest('hex');
  }
  return out;
}

function buildPick(kind, id) {
  if (kind === 'hdri') {
    return makePick(id, 'hdri', { role: 'environment', source: { type: 'polyhaven', id: 'x_y', resolution: '1k' } });
  }
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

const kindsArb = fc.array(fc.constantFrom('texture', 'hdri', 'model', 'audio'), { minLength: 1, maxLength: 6 });

describe('runFetch re-run idempotence', () => {
  // Feature: asset-pipeline, Property 1: Re-run idempotence
  // **Validates: Requirements 14.3, 18.4**
  it('second run with unchanged picks and cache changes nothing and downloads nothing', async () => {
    await fc.assert(
      fc.asyncProperty(kindsArb, async (kinds) => {
        const { env, roots, downloadCalls, convertCalls } = await makeEnv();
        try {
          const picks = kinds.map((k, i) => buildPick(k, `p${i}-${k}`));
          for (const p of picks.filter((x) => x.manual)) {
            const dir = path.join(roots.cacheRoot, 'manual', p.id);
            await mkdir(dir, { recursive: true });
            await writeFile(path.join(dir, p.expectedFile), `wav-${p.id}`);
          }
          const first = await runFetch({ picks, env });
          if (first.failed.length || first.exitCode !== 0) throw new Error(`first run failed: ${JSON.stringify(first.failed)}`);

          const assetsBefore = await hashTree(roots.assetRoot);
          const creditsBefore = await readFile(roots.creditsFile, 'utf8');
          const dl = downloadCalls.length;
          const cv = convertCalls.length;

          const second = await runFetch({ picks, env });
          if (second.failed.length || second.exitCode !== 0) throw new Error('second run failed');
          if (downloadCalls.length !== dl) throw new Error('second run issued downloads');
          if (convertCalls.length !== cv) throw new Error('second run reconverted');
          if (second.written.length !== 0) throw new Error(`second run wrote ${second.written}`);

          const assetsAfter = await hashTree(roots.assetRoot);
          if (JSON.stringify(assetsAfter) !== JSON.stringify(assetsBefore)) throw new Error('asset tree hashes changed');
          if (!('manifest.json' in assetsAfter)) throw new Error('manifest missing');
          if ((await readFile(roots.creditsFile, 'utf8')) !== creditsBefore) throw new Error('CREDITS changed');
        } finally {
          await rm(roots.repoRoot, { recursive: true, force: true });
        }
      }),
      { numRuns: 30 },
    );
  }, 240000);
});
