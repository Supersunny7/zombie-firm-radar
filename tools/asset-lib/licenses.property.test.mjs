// Feature: asset-pipeline, Property 7: License allow-list is exact
// **Validates: Requirements 18.7**
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  checkLicense,
  normalizeLicense,
  isForbiddenHost,
  LICENSE_ALIASES,
  FORBIDDEN_HOSTS,
} from './licenses.mjs';

const NUM_RUNS = 200;
const GOOD_URL = 'https://example.org/asset';
const ALL_ALIASES = Object.values(LICENSE_ALIASES).flat();
const ALIAS_SET = new Set(ALL_ALIASES);

const pickWith = (license, sourceUrl = GOOD_URL) => ({
  sourceUrl,
  author: 'Some Author',
  license,
});

const wsChar = fc.constantFrom(' ', '\t', '\n', '_', '  ');
const wsRun = fc.array(wsChar, { minLength: 1, maxLength: 4 }).map((a) => a.join(''));
const padding = fc
  .array(fc.constantFrom(' ', '\t', '\n'), { maxLength: 3 })
  .map((a) => a.join(''));

/** A messy spelling of an alias: random case, whitespace/underscore runs for spaces, padding. */
const messyAlias = fc
  .tuple(
    fc.constantFrom(...ALL_ALIASES),
    fc.array(fc.boolean(), { minLength: 40, maxLength: 40 }),
    fc.array(wsRun, { minLength: 10, maxLength: 10 }),
    padding,
    padding,
  )
  .map(([alias, flips, runs, lead, trail]) => {
    let i = 0;
    let j = 0;
    const body = [...alias]
      .map((ch) => {
        if (ch === ' ') return runs[j++ % runs.length];
        return flips[i++ % flips.length] ? ch.toUpperCase() : ch;
      })
      .join('');
    return { alias, text: `${lead}${body}${trail}` };
  });

// Feature: graveyard-horror-pass, Property 2: Mixamo hosts are refused, animation-free CC BY Sketchfab picks are accepted
// **Validates: Requirements 4.5, 4.6, 4.7**
describe('Property 2: Mixamo hosts refused, animation-free CC BY Sketchfab picks accepted', () => {
  const slug = fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/);
  const ccBy = fc.constantFrom('CC BY', 'cc by 4.0', 'CC-BY-4.0', 'cc by 3.0');
  const subs = fc.array(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), { maxLength: 2 });
  const edits = fc.constantFrom(
    [{ op: 'removeAnimations' }],
    [{ op: 'removeAnimations' }, { op: 'decimate', targetTriangles: 30000 }],
    [{ op: 'specGlossToMetalRough' }, { op: 'removeAnimations' }],
  );
  const pickOf = (license, sourceUrl, e) => ({
    edits: e,
    credits: { title: 'T', author: 'Some Author', sourceUrl, license },
  });

  it('refuses any mixamo.com host or subdomain, even with removeAnimations', () => {
    fc.assert(
      fc.property(ccBy, subs, slug, edits, (lic, s, path, e) => {
        const url = `https://${[...s, 'mixamo.com'].join('.')}/${path}`;
        expect(checkLicense(pickOf(lic, url, e))).toEqual({ ok: false, reason: 'forbidden' });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('accepts CC BY Sketchfab picks whose edits remove animations', () => {
    fc.assert(
      fc.property(ccBy, slug, edits, (lic, path, e) => {
        const r = checkLicense(pickOf(lic, `https://sketchfab.com/3d-models/${path}`, e));
        expect(r).toEqual({ ok: true, canonical: 'CC BY' });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 7: License allow-list is exact', () => {
  it('accepts every messy spelling of an allowed alias with a non-forbidden host', () => {
    fc.assert(
      fc.property(messyAlias, ({ alias, text }) => {
        expect(normalizeLicense(text)).toBe(alias);
        const r = checkLicense(pickWith(text));
        expect(r.ok).toBe(true);
        const canonical = Object.entries(LICENSE_ALIASES).find(([, a]) => a.includes(alias))[0];
        expect(r.canonical).toBe(canonical);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('refuses every allowed license when the source host is a forbidden marketplace (incl. subdomains)', () => {
    const labels = fc.array(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), { maxLength: 2 });
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ALIASES),
        fc.constantFrom(...FORBIDDEN_HOSTS),
        labels,
        fc.boolean(),
        (alias, host, subs, upper) => {
          const h = [...subs, host].join('.');
          const url = `https://${upper ? h.toUpperCase() : h}/model/1`;
          expect(isForbiddenHost(url)).toBe(true);
          const r = checkLicense(pickWith(alias, url));
          expect(r.ok).toBe(false);
          expect(r.reason).toBe('forbidden');
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('does not treat look-alike hosts as forbidden', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ALIASES),
        fc.constantFrom(...FORBIDDEN_HOSTS),
        fc.stringMatching(/^[a-z]{1,6}$/),
        (alias, host, prefix) => {
          const url = `https://${prefix}${host}/x`;
          expect(isForbiddenHost(url)).toBe(false);
          expect(checkLicense(pickWith(alias, url)).ok).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('refuses any license string containing an NC token or "non-commercial"', () => {
    const ncPiece = fc.constantFrom(
      'nc',
      'NC',
      'non-commercial',
      'Non Commercial',
      'noncommercial',
      'NonCommercial',
    );
    const base = fc.oneof(fc.constantFrom(...ALL_ALIASES), fc.constantFrom('cc by', 'cc by 4.0'));
    fc.assert(
      fc.property(base, ncPiece, fc.constantFrom(' ', '-', '_'), fc.boolean(), (b, nc, sep, front) => {
        const text = front ? `${nc}${sep}${b}` : `${b}${sep}${nc}`;
        const r = checkLicense(pickWith(text));
        expect(r.ok).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
    for (const s of ['CC BY-NC 4.0', 'CC BY-NC-SA 4.0', 'CC BY-NC-ND 3.0', 'cc-by-nc-4.0']) {
      expect(checkLicense(pickWith(s))).toEqual({ ok: false, reason: 'forbidden' });
    }
  });

  it('refuses every CC BY-SA / CC BY-ND variant', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('sa', 'nd', 'SA', 'ND'),
        fc.constantFrom('1.0', '2.0', '2.5', '3.0', '4.0'),
        fc.constantFrom(' ', '-'),
        fc.constantFrom(' ', '-'),
        fc.constantFrom('cc by', 'cc-by', 'CC BY'),
        (variant, ver, s1, s2, head) => {
          const text = `${head}${s1}${variant}${s2}${ver}`;
          expect(checkLicense(pickWith(text)).ok).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('refuses empty, whitespace-only and missing license strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(' ', '\t', '\n'), { maxLength: 6 }).map((a) => a.join('')),
        (ws) => {
          expect(checkLicense(pickWith(ws)).ok).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
    expect(checkLicense({ sourceUrl: GOOD_URL, author: 'A' }).ok).toBe(false);
  });

  it('accepts an arbitrary string if and only if its normalised form is exactly an alias', () => {
    const noise = fc.oneof(
      fc.string({ maxLength: 30 }),
      fc.constantFrom(...ALL_ALIASES).chain((a) =>
        fc.oneof(
          fc.constant(`${a} extra`),
          fc.constant(`x${a}`),
          fc.constant(a.slice(0, -1)),
          fc.constant(a.slice(1)),
          fc.constant(`${a}.`),
        ),
      ),
    );
    fc.assert(
      fc.property(noise, (text) => {
        const r = checkLicense(pickWith(text));
        expect(r.ok).toBe(ALIAS_SET.has(normalizeLicense(text)));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('is deterministic: the same pick always yields the same verdict', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (text) => {
        expect(checkLicense(pickWith(text))).toEqual(checkLicense(pickWith(text)));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
