// Feature: app-shell, Property 11: Unknown or malformed CIKs never reach the network
import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createLoader } from './loader';
import { fixtureBundle } from '../dev/fixtures';

const listed = new Set(fixtureBundle.index.firms.map((f) => f.cik));

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** Mock fetch that serves only the index and macro; counts every request. */
function makeFetch() {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    if (url.endsWith('/firms_index.json')) return json(fixtureBundle.index);
    if (url.endsWith('/macro.json')) return json(fixtureBundle.macro);
    return new Response('not found', { status: 404 });
  });
}

const traversal = fc.constantFrom(
  '../../etc/passwd',
  '..\\..\\windows\\win.ini',
  '../firms_index',
  '%2e%2e%2f',
  '9000000001/../9000000002',
  '9000000001/../../macro',
  '9000000001.json',
  '/data/mock/macro',
  'https://example.com/x',
  '9000000001?x=1',
  '9000000001#',
  ' 9000000001',
  '9000000001\n',
  '',
);

const arbBadCik: fc.Arbitrary<string> = fc
  .oneof(
    fc.string({ maxLength: 40 }),
    fc.string({ unit: 'grapheme', maxLength: 20 }),
    traversal,
    fc
      .tuple(fc.string({ maxLength: 8 }), traversal, fc.string({ maxLength: 8 }))
      .map((p) => p.join('')),
    fc.stringMatching(/^\d{10}$/), // well formed but usually not listed
    fc.stringMatching(/^\d{1,9}$/),
    fc.stringMatching(/^\d{11,14}$/),
  )
  .filter((s) => !listed.has(s));

describe('Property 11: Unknown or malformed CIKs never reach the network', () => {
  /** **Validates: Requirements 6.2, 6.12** */
  it('loadFirm returns an error and makes zero firm-file requests', async () => {
    await fc.assert(
      fc.asyncProperty(arbBadCik, async (cik) => {
        const fetchMock = makeFetch();
        const loader = createLoader({ fetch: fetchMock as unknown as typeof fetch, isDev: true });
        const start = await loader.loadStartup();
        expect(start.ok).toBe(true);

        const result = await loader.loadFirm(cik);
        expect(result.ok).toBe(false);

        const firmCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/firms/'));
        expect(firmCalls).toHaveLength(0);
        // Nothing but the startup files was requested.
        for (const [u] of fetchMock.mock.calls) {
          expect(String(u)).toMatch(/\/(firms_index|macro)\.json$/);
        }
      }),
      { numRuns: 150 },
    );
  });

  it('loadFirm rejects malformed CIKs before any request, even without a loaded index', async () => {
    await fc.assert(
      fc.asyncProperty(arbBadCik, async (cik) => {
        const fetchMock = makeFetch();
        const loader = createLoader({ fetch: fetchMock as unknown as typeof fetch, isDev: true });
        const result = await loader.loadFirm(cik);
        expect(result.ok).toBe(false);
        expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/firms/'))).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});
