// Feature: asset-pipeline, Property 10: Retries are bounded and failures are isolated
// **Validates: Requirements 14.5**
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { makeDownloader } from './downloader.mjs';
import { RETRY_DELAYS_MS } from './http.mjs';
import { runFetch } from './run-fetch.mjs';
import { makeEnv, makePick } from './test-helpers/fakes.mjs';

const exists = (p) => stat(p).then(() => true, () => false);

// failures[i] = number of consecutive failures before the download would succeed (0 = never fails)
const scenario = fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 5 });
const FAIL_KINDS = ['network', 'timeout', 'http'];

describe('Property 10: retries are bounded and failures are isolated', () => {
  it('attempts each failing download at most 3 times, isolates failures and sets the exit code', async () => {
    await fc.assert(
      fc.asyncProperty(scenario, fc.constantFrom(...FAIL_KINDS), async (failures, failKind) => {
        const { env, roots } = await makeEnv();
        const attempts = new Map();
        const sleeps = [];
        const fakeFetch = async (url) => {
          const id = /\/(p\d+)\.png$/.exec(String(url))[1];
          const n = (attempts.get(id) ?? 0) + 1;
          attempts.set(id, n);
          const idx = Number(id.slice(1));
          if (n <= failures[idx]) {
            if (failKind === 'network') throw new Error('socket hang up');
            if (failKind === 'timeout') throw Object.assign(new Error('aborted'), { name: 'TimeoutError' });
            return new Response('nope', { status: 503 });
          }
          return new Response(`png-bytes-${id}`);
        };
        env.download = makeDownloader({
          fetch: fakeFetch,
          userAgent: 'test-agent',
          sleep: async (ms) => {
            sleeps.push(ms);
          },
        });

        const picks = failures.map((_, i) =>
          makePick(`p${i}`, 'texture', { source: { type: 'url', url: `https://example.org/p${i}.png` } }),
        );
        // Previously produced output for every pick; failing ones must stay byte-identical.
        const existing = new Map();
        for (const [i, pick] of picks.entries()) {
          const dir = path.join(roots.assetRoot, 'textures', pick.id);
          await mkdir(dir, { recursive: true });
          const file = path.join(dir, `${pick.id}_color.webp`);
          await writeFile(file, `old-output-${i}`);
          existing.set(pick.id, { file, text: `old-output-${i}` });
        }

        const r = await runFetch({ picks, env });

        const failing = failures.map((f) => f >= 3);
        let expectedSleeps = 0;
        picks.forEach((pick, i) => {
          const f = failures[i];
          expect(attempts.get(pick.id)).toBe(Math.min(f + 1, 3));
          expectedSleeps += Math.min(f, 2);
          if (failing[i]) {
            const hit = r.failed.find((x) => x.name === pick.id);
            expect(hit).toBeTruthy();
            expect(hit.cause).toContain(pick.source.url);
          } else {
            expect(r.failed.some((x) => x.name === pick.id)).toBe(false);
            expect(r.written).toContain(`textures/${pick.id}/${pick.id}_color.webp`);
          }
        });
        // back-off uses the documented delays only, and no more than 2 sleeps per download
        expect(sleeps).toHaveLength(expectedSleeps);
        for (const s of sleeps) expect(RETRY_DELAYS_MS).toContain(s);

        // failed picks keep their previous output unchanged; no partial files remain
        for (const [i, pick] of picks.entries()) {
          if (!failing[i]) continue;
          const { file, text } = existing.get(pick.id);
          expect(await readFile(file, 'utf8')).toBe(text);
          expect(await exists(`${file}.part`)).toBe(false);
        }
        expect(r.failed.map((x) => x.name).sort()).toEqual(
          picks.filter((_, i) => failing[i]).map((p) => p.id).sort(),
        );
        expect(r.exitCode).toBe(failing.some(Boolean) ? 1 : 0);
      }),
      { numRuns: 30 },
    );
  }, 240_000);
});
