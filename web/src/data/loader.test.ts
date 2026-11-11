import { describe, expect, it, vi } from 'vitest';
import { fixtureBundle } from '../dev/fixtures';
import { createLoader } from './loader';

// Requirements 6.3-6.6, 6.8-6.11, 6.14, 6.15, 7.8.

const ashgrove = fixtureBundle.firms['9000000001'] ?? Object.values(fixtureBundle.firms)[0];
if (!ashgrove) throw new Error('fixture has no firms');
const CIK = ashgrove.cik;

type Route = unknown | number | Error | 'badjson';

/** Build a mocked fetch from a URL -> route map. Unlisted URLs answer 404. */
function mockFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const r = routes[url];
    if (r === undefined) return new Response('not found', { status: 404 });
    if (r instanceof Error) throw r;
    if (typeof r === 'number') return new Response('error', { status: r });
    if (r === 'badjson') return new Response('{not json', { status: 200 });
    return new Response(JSON.stringify(r), { status: 200 });
  });
  return { fetch: fn as unknown as typeof fetch, calls, fn };
}

const base = (b: string, withFirm = true): Record<string, Route> => ({
  [`${b}firms_index.json`]: fixtureBundle.index,
  [`${b}macro.json`]: fixtureBundle.macro,
  ...(withFirm ? { [`${b}firms/${CIK}.json`]: ashgrove } : {}),
});

describe('loader sources', () => {
  it('uses mock in dev when /data/mock/ exists', async () => {
    const m = mockFetch(base('/data/mock/'));
    const loader = createLoader({ fetch: m.fetch, isDev: true });
    const res = await loader.loadStartup();
    expect(res.ok && res.value.source).toBe('mock');
    const firm = await loader.loadFirm(CIK);
    expect(firm.ok).toBe(true);
    expect(m.calls).toContain(`/data/mock/firms/${CIK}.json`);
  });

  it('falls back to the fixture in dev when mock index is missing', async () => {
    const m = mockFetch({});
    const loadFixture = vi.fn(async () => fixtureBundle);
    const loader = createLoader({ fetch: m.fetch, isDev: true, loadFixture });
    const res = await loader.loadStartup();
    expect(res.ok && res.value.source).toBe('fixture');
    const firm = await loader.loadFirm(CIK);
    expect(firm.ok && firm.value.cik).toBe(CIK);
    expect(m.calls.some((u) => u.includes('/firms/'))).toBe(false);
  });

  it('uses real in production and never requests /data/mock/', async () => {
    const m = mockFetch(base('/data/'));
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    const res = await loader.loadStartup();
    expect(res.ok && res.value.source).toBe('real');
    await loader.loadFirm(CIK);
    expect(m.calls.length).toBeGreaterThan(0);
    expect(m.calls.some((u) => u.startsWith('/data/mock/'))).toBe(false);
  });

  it('falls back to mock in production when the real index is missing', async () => {
    const m = mockFetch(base('/data/mock/'));
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    const res = await loader.loadStartup();
    expect(res.ok && res.value.source).toBe('mock');
    expect(m.calls[0]).toBe('/data/firms_index.json');
  });

  it('errors in production when neither index exists', async () => {
    const m = mockFetch({});
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    const res = await loader.loadStartup();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.file).toBe('/data/mock/firms_index.json');
      expect(res.error.status).toBe(404);
    }
  });

  it('does not fall back to mock when the real index is invalid JSON', async () => {
    const m = mockFetch({ '/data/firms_index.json': 'badjson', ...base('/data/mock/') });
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    const res = await loader.loadStartup();
    expect(!res.ok && res.error.status).toBe('invalid json');
    expect(m.calls.some((u) => u.startsWith('/data/mock/'))).toBe(false);
  });
});

describe('loader failures', () => {
  it('reports a non-2xx on macro.json', async () => {
    const m = mockFetch({ ...base('/data/'), '/data/macro.json': 500 });
    const res = await createLoader({ fetch: m.fetch, isDev: false }).loadStartup();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.file).toBe('/data/macro.json');
      expect(res.error.status).toBe(500);
    }
  });

  it('reports a network error', async () => {
    const m = mockFetch({ ...base('/data/'), '/data/macro.json': new TypeError('offline') });
    const res = await createLoader({ fetch: m.fetch, isDev: false }).loadStartup();
    expect(!res.ok && res.error.status).toBe('network error');
  });

  it('reports invalid JSON', async () => {
    const m = mockFetch({ ...base('/data/'), '/data/macro.json': 'badjson' });
    const res = await createLoader({ fetch: m.fetch, isDev: false }).loadStartup();
    expect(!res.ok && res.error.status).toBe('invalid json');
  });

  it('reports data that fails the guard', async () => {
    const m = mockFetch({ ...base('/data/'), '/data/macro.json': { dgs10: 1 } });
    const res = await createLoader({ fetch: m.fetch, isDev: false }).loadStartup();
    expect(!res.ok && res.error.status).toBe('invalid data');
  });
});

describe('loader caching and retry', () => {
  it('makes one request per file on repeated calls', async () => {
    const m = mockFetch(base('/data/'));
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    await loader.loadStartup();
    await loader.loadStartup();
    await loader.loadFirm(CIK);
    await loader.loadFirm(CIK);
    const count = (u: string) => m.calls.filter((c) => c === u).length;
    expect(count('/data/firms_index.json')).toBe(1);
    expect(count('/data/macro.json')).toBe(1);
    expect(count(`/data/firms/${CIK}.json`)).toBe(1);
  });

  it('shares one in-flight startup between concurrent calls', async () => {
    const m = mockFetch(base('/data/'));
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    await Promise.all([loader.loadStartup(), loader.loadStartup()]);
    expect(m.calls.filter((c) => c === '/data/firms_index.json')).toHaveLength(1);
  });

  it('does not cache a failed firm load', async () => {
    const routes = base('/data/', false);
    routes[`/data/firms/${CIK}.json`] = 500;
    const m = mockFetch(routes);
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    expect((await loader.loadFirm(CIK)).ok).toBe(false);
    routes[`/data/firms/${CIK}.json`] = ashgrove;
    expect((await loader.loadFirm(CIK)).ok).toBe(true);
    expect(m.calls.filter((c) => c === `/data/firms/${CIK}.json`)).toHaveLength(2);
  });

  it('retry allows a failed startup to succeed', async () => {
    const routes = base('/data/');
    routes['/data/macro.json'] = 503;
    const m = mockFetch(routes);
    const loader = createLoader({ fetch: m.fetch, isDev: false });
    expect((await loader.loadStartup()).ok).toBe(false);
    routes['/data/macro.json'] = fixtureBundle.macro;
    loader.retry();
    const res = await loader.loadStartup();
    expect(res.ok && res.value.source).toBe('real');
  });

  it('never requests keeper_log.json', async () => {
    const dev = mockFetch(base('/data/mock/'));
    const devLoader = createLoader({ fetch: dev.fetch, isDev: true });
    await devLoader.loadStartup();
    await devLoader.loadFirm(CIK);
    const prod = mockFetch(base('/data/'));
    const prodLoader = createLoader({ fetch: prod.fetch, isDev: false });
    await prodLoader.loadStartup();
    await prodLoader.loadFirm(CIK);
    const none = mockFetch({});
    await createLoader({ fetch: none.fetch, isDev: false }).loadStartup();
    for (const c of [...dev.calls, ...prod.calls, ...none.calls]) {
      expect(c).not.toContain('keeper_log');
    }
  });
});
