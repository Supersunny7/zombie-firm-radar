// Feature: asset-pipeline, Property 12: Network discipline
// **Validates: Requirements 14.6, 14.8, 14.9**
// Every request carries the descriptive User-Agent, only allowed hosts/endpoints are contacted over https,
// and manual picks cause zero requests. A recording fake fetch is injected; no real network.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { makeDownloader } from './downloader.mjs';
import { buildUserAgent } from './http.mjs';
import { runFetch } from './run-fetch.mjs';
import { makeEnv, makePick } from './test-helpers/fakes.mjs';

const SHA = 'a'.repeat(40);
const RB = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox';
const DL = 'https://dl.polyhaven.org/file';

/** Recording fake fetch that serves canned responses by URL and rejects anything unexpected. */
function makeRecorder() {
  const requests = [];
  const fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    requests.push({ url: String(url), protocol: u.protocol, host: u.hostname, path: u.pathname, headers: init.headers ?? {} });
    if (u.hostname === 'api.polyhaven.com') {
      const m = /^\/files\/([A-Za-z0-9_]+)$/.exec(u.pathname);
      if (!m) return new Response('no', { status: 404 });
      const id = m[1];
      const entry = (n) => ({ url: `${DL}/${id}/${n}`, size: 4 });
      return Response.json({
        hdri: { '1k': { hdr: entry(`${id}_1k.hdr`) } },
        Diffuse: { '1k': { jpg: entry(`${id}_diff.jpg`) } },
        nor_gl: { '1k': { jpg: entry(`${id}_nor.jpg`) } },
        Rough: { '1k': { jpg: entry(`${id}_rough.jpg`) } },
        gltf: { '1k': { gltf: { ...entry(`${id}.gltf`), include: { [`${id}.bin`]: entry(`${id}.bin`) } } } },
      });
    }
    if (u.hostname === 'api.github.com') {
      return Response.json([
        { type: 'file', name: 'a.tga', download_url: `${RB}/${SHA}/Avatars/x/Textures/a.tga` },
      ]);
    }
    return new Response('data', { status: 200 });
  };
  return { fetch, requests };
}

const idArb = fc.stringMatching(/^[a-z]{3,8}$/);
const kindArb = fc.constantFrom('polyhaven-hdri', 'polyhaven-texture', 'polyhaven-model', 'oga', 'rocketbox', 'manual-present', 'manual-absent');

function buildPick(kind, id) {
  switch (kind) {
    case 'polyhaven-hdri':
      return makePick(id, 'hdri', { role: 'environment', source: { type: 'polyhaven', id: 'sky_x', resolution: '1k' } });
    case 'polyhaven-texture':
      return makePick(id, 'texture', { source: { type: 'polyhaven', id: 'rock_x', resolution: '1k' } });
    case 'polyhaven-model':
      return makePick(id, 'model', { source: { type: 'polyhaven', id: 'gate_x', resolution: '1k' } });
    case 'oga':
      return makePick(id, 'texture', { source: { type: 'url', url: `https://opengameart.org/sites/default/files/${id}.png` } });
    case 'rocketbox':
      return makePick(id, 'avatar', { source: { type: 'url', url: `${RB}/${SHA}/Avatars/x/${id}.fbx` } });
    default:
      return makePick(id, 'audio', {
        group: 'lab',
        source: { type: 'manual', pageUrl: 'https://freesound.org/s/1/', downloadOption: 'Download original' },
        manual: true,
        expectedFile: `${id}.wav`,
        targetFolder: `tools/cache/manual/${id}`,
      });
  }
}

const picksArb = fc
  .uniqueArray(fc.record({ id: idArb, kind: kindArb }), { selector: (p) => p.id, minLength: 1, maxLength: 7 });

const ALLOWED_HOSTS = new Set(['api.polyhaven.com', 'dl.polyhaven.org', 'raw.githubusercontent.com', 'api.github.com', 'opengameart.org']);

describe('Property 12: Network discipline', () => {
  it('sends the User-Agent on every request, contacts only allowed https hosts and endpoints, and skips the network for manual picks', async () => {
    const ua = await buildUserAgent();
    expect(ua).toMatch(/^ZombieFirmRadar-asset-fetch\/1\.0 \(\+https:\/\/.+\)$/);
    await fc.assert(
      fc.asyncProperty(picksArb, async (specs) => {
        const picks = specs.map((s) => buildPick(s.kind, s.id));
        const { fetch, requests } = makeRecorder();
        const { env, roots } = await makeEnv();
        try {
          env.download = makeDownloader({ fetch, userAgent: ua, sleep: async () => {} });
          for (const s of specs.filter((x) => x.kind === 'manual-present')) {
            const dir = path.join(roots.cacheRoot, 'manual', s.id);
            await mkdir(dir, { recursive: true });
            await writeFile(path.join(dir, `${s.id}.wav`), 'wav');
          }
          const r = await runFetch({ picks, env });

          for (const req of requests) {
            expect(req.headers['User-Agent']).toBe(ua);
            expect(req.protocol).toBe('https:');
            expect(ALLOWED_HOSTS.has(req.host)).toBe(true);
            if (req.host === 'api.polyhaven.com') expect(req.path).toMatch(/^\/files\/[A-Za-z0-9_]+$/);
            if (req.host === 'api.github.com') expect(req.path).toMatch(/^\/repos\/microsoft\/Microsoft-Rocketbox\/contents\//);
            if (req.host === 'raw.githubusercontent.com') expect(req.path).toContain(`/microsoft/Microsoft-Rocketbox/${SHA}/`);
          }
          // Manual picks never reach the network: no request mentions their id or page.
          const manualIds = specs.filter((s) => s.kind.startsWith('manual')).map((s) => s.id);
          for (const req of requests) {
            expect(req.host).not.toBe('freesound.org');
            for (const id of manualIds) expect(req.url).not.toContain(`/${id}.`);
          }
          // Request count matches only the non-manual picks (no requests at all for manual-only lists).
          if (specs.every((s) => s.kind.startsWith('manual'))) expect(requests).toEqual([]);
          // Missing manual files are reported and fail the run.
          const absent = specs.filter((s) => s.kind === 'manual-absent');
          expect(r.missing).toHaveLength(absent.length);
          if (absent.length > 0) expect(r.exitCode).toBe(1);
        } finally {
          await rm(roots.repoRoot, { recursive: true, force: true });
        }
      }),
      { numRuns: 30 },
    );
  });

  it('refuses non-https URLs without making a request', async () => {
    const ua = 'ZombieFirmRadar-asset-fetch/1.0 (+https://example.test/repo)';
    await fc.assert(
      fc.asyncProperty(idArb, async (id) => {
        const { fetch, requests } = makeRecorder();
        const { env, roots } = await makeEnv();
        try {
          env.download = makeDownloader({ fetch, userAgent: ua, sleep: async () => {} });
          const pick = makePick(id, 'texture', { source: { type: 'url', url: `http://opengameart.org/${id}.png` } });
          const r = await runFetch({ picks: [pick], env });
          expect(requests).toEqual([]);
          expect(r.written).toEqual([]);
          expect(r.exitCode).toBe(1);
        } finally {
          await rm(roots.repoRoot, { recursive: true, force: true });
        }
      }),
      { numRuns: 25 },
    );
  });
});
