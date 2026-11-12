import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, check, manualPicks, HOOK_ID } from './manual-readme.mjs';

// Feature: asset-pipeline, Property 15: Manual README lists every manual pick
// **Validates: Requirements 15.1, 40.1, 40.2, 40.3, 40.5, 40.6**

const word = fc.stringMatching(/^[a-z0-9]{1,8}$/);

// Unique ids: the index suffix keeps them distinct; prefixes pick the source family.
const pickArb = (i) =>
  fc
    .record({
      prefix: fc.constantFrom('sketchfab', 'freesound', 'polyhaven', 'rocketbox'),
      slug: word,
      manual: fc.boolean(),
      ext: fc.constantFrom('zip', 'wav', 'mp3', 'm4a'),
      note: fc.option(word, { nil: undefined }),
      author: word,
      title: word,
      license: fc.constantFrom('CC0', 'CC BY 4.0', 'MIT'),
    })
    .map((r) => {
      const id = `${r.prefix}-${r.slug}-${i}`;
      return {
        id,
        kind: r.prefix === 'freesound' ? 'audio' : 'model',
        group: 'lab',
        manual: r.manual,
        expectedFile: `${id}.${r.ext}`,
        targetFolder: `tools/cache/manual/${id}`,
        source: {
          type: r.manual ? 'manual' : 'polyhaven',
          pageUrl: `https://example.org/${r.slug}/${i}`,
          downloadOption: `Option ${r.slug} ${i}`,
          ...(r.note ? { note: `Note ${r.note}` } : {}),
        },
        credits: {
          title: `T${r.title}`,
          author: r.author,
          sourceUrl: `https://example.org/${r.slug}/${i}`,
          license: r.license,
          changes: 'x',
        },
      };
    });

const hookPick = () => ({
  id: HOOK_ID,
  kind: 'model',
  group: 'lab',
  manual: true,
  expectedFile: `${HOOK_ID}.zip`,
  targetFolder: `tools/cache/manual/${HOOK_ID}`,
  source: { type: 'manual', pageUrl: 'https://sketchfab.com/3d-models/hook', downloadOption: 'Hook option' },
  credits: { title: 'Hook', author: 'someone', sourceUrl: 'https://sketchfab.com/3d-models/hook', license: 'CC BY 4.0', changes: 'x' },
});

const picksArb = fc
  .integer({ min: 0, max: 10 })
  .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => pickArb(i))))
  .chain((list) =>
    fc.record({ list: fc.constant(list), withHook: fc.boolean(), passed: fc.boolean() }),
  )
  .map(({ list, withHook, passed }) => ({
    picks: withHook ? [...list, hookPick()] : list,
    passed,
  }));

const headings = (text) => [...text.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
const blockOf = (text, id) => {
  const part = text.split(/^### /m).find((s) => s.startsWith(`${id}\n`));
  return part.split(/^## /m)[0];
};

describe('Property 15: Manual README lists every manual pick', () => {
  it('has exactly one complete entry per manual pick and none for others', () => {
    fc.assert(
      fc.property(picksArb, ({ picks, passed }) => {
        const opts = { hookCheckPassed: passed };
        const text = render(picks, opts);
        const expected = picks
          .filter((p) => p.manual === true && (p.id !== HOOK_ID || passed))
          .map((p) => p.id)
          .sort();
        expect(headings(text).slice().sort()).toEqual(expected);
        expect(manualPicks(picks, opts).map((p) => p.id).sort()).toEqual(expected);
        for (const p of picks.filter((x) => expected.includes(x.id))) {
          const b = blockOf(text, p.id);
          expect(b).toContain(`- Source page: ${p.source.pageUrl}`);
          expect(b).toContain(`- Download option: ${p.source.downloadOption}`);
          expect(b).toContain(`- Expected file name: ${p.expectedFile}`);
          expect(b).toContain(`- Put it at: tools/cache/manual/${p.id}/${p.expectedFile}`);
          expect(b).toContain(`- Credit line: "${p.credits.title}"`);
          if (p.source.note) expect(b).toContain(`- Notes: ${p.source.note}`);
        }
        for (const p of picks.filter((x) => !expected.includes(x.id))) {
          expect(text).not.toContain(`### ${p.id}`);
          expect(text).not.toContain(`/${p.id}/`);
        }
        expect(check(picks, text, opts).upToDate).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('omits the rejected hook unless its check flag passed', () => {
    fc.assert(
      fc.property(picksArb, ({ picks }) => {
        expect(headings(render(picks))).not.toContain(HOOK_ID);
        expect(render(picks)).not.toContain(`tools/cache/manual/${HOOK_ID}/`);
        if (picks.some((p) => p.id === HOOK_ID)) {
          expect(headings(render(picks, { hookCheckPassed: true }))).toContain(HOOK_ID);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic and independent of input order', () => {
    fc.assert(
      fc.property(picksArb, ({ picks, passed }) => {
        const opts = { hookCheckPassed: passed };
        const a = render(picks, opts);
        expect(render(picks, opts)).toBe(a);
        expect(render(picks.slice().reverse(), opts)).toBe(a);
      }),
      { numRuns: 100 },
    );
  });
});
