import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { formatRunReport } from './report.mjs';
import { runFetch } from './run-fetch.mjs';
import { makeEnv, makePick } from './test-helpers/fakes.mjs';

const exists = (p) => stat(p).then(() => true, () => false);

// Each invalid variant: credits overrides and the text the reason must contain.
const INVALID = [
  { credits: { license: 'CC BY-NC 4.0' }, reason: 'forbidden' },
  { credits: { license: 'CC BY-SA 4.0' }, reason: 'not on allow list' },
  { credits: { license: 'CC BY-ND 4.0' }, reason: 'not on allow list' },
  { credits: { license: 'GPL-3.0' }, reason: 'not on allow list' },
  { credits: { license: 'All rights reserved' }, reason: 'not on allow list' },
  { credits: { license: '' }, reason: 'missing field: license' },
  { credits: { license: '   ' }, reason: 'missing field: license' },
  { credits: { author: '' }, reason: 'missing field: author' },
  { credits: { sourceUrl: '' }, reason: 'missing field: sourceUrl' },
];

const VALID_LICENSES = ['CC0', 'MIT', 'Apache-2.0', 'SIL OFL'];

const pickSpec = fc.oneof(
  fc.record({ valid: fc.constant(true), license: fc.constantFrom(...VALID_LICENSES) }),
  fc.record({ valid: fc.constant(false), variant: fc.integer({ min: 0, max: INVALID.length - 1 }) }),
);

describe('run-fetch refused picks (property)', () => {
  // Feature: asset-pipeline, Property 8: Refused picks leave no trace and fail the run
  // **Validates: Requirements 18.7, 18.8, 18.9**
  it('Property 8: refused picks leave no trace and fail the run', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(pickSpec, { minLength: 1, maxLength: 6 }), async (specs) => {
        const { env, roots, downloadCalls } = await makeEnv();
        const picks = specs.map((s, i) =>
          s.valid
            ? makePick(`val${i}-tex`, 'texture', { credits: { license: s.license } })
            : makePick(`bad${i}-tex`, 'texture', { credits: INVALID[s.variant].credits }),
        );
        const r = await runFetch({ picks, env });

        const bad = specs.map((s, i) => ({ s, i })).filter((x) => !x.s.valid);
        const good = specs.map((s, i) => ({ s, i })).filter((x) => x.s.valid);

        // Refused list: exactly the invalid picks, each with its reason.
        expect(r.refused.map((x) => x.name).sort()).toEqual(bad.map((x) => `bad${x.i}-tex`).sort());
        const report = formatRunReport(r);
        for (const { s, i } of bad) {
          const entry = r.refused.find((x) => x.name === `bad${i}-tex`);
          expect(entry.reason).toContain(INVALID[s.variant].reason);
          expect(report).toContain(`refused: bad${i}-tex: ${entry.reason}`);
        }

        // No files, downloads, manifest entries or credits rows for refused picks.
        const manifestPath = path.join(roots.assetRoot, 'manifest.json');
        const manifestKeys = (await exists(manifestPath))
          ? Object.keys(JSON.parse(await readFile(manifestPath, 'utf8')).files)
          : [];
        const credits = await readFile(roots.creditsFile, 'utf8');
        for (const { i } of bad) {
          const id = `bad${i}-tex`;
          expect(await exists(path.join(roots.assetRoot, 'textures', id))).toBe(false);
          expect(r.written.some((w) => w.includes(`/${id}/`))).toBe(false);
          expect(manifestKeys.some((k) => k.includes(`/${id}/`))).toBe(false);
          expect(credits).not.toContain(`/${id}/`);
          expect(downloadCalls).not.toContain(id);
        }

        // Valid picks are processed normally.
        expect(r.failed).toEqual([]);
        expect(r.written.sort()).toEqual(good.map((x) => `textures/val${x.i}-tex/val${x.i}-tex_color.webp`).sort());
        for (const { i } of good) {
          expect(manifestKeys).toContain(`textures/val${i}-tex/val${i}-tex_color.webp`);
          expect(credits).toContain(`web/public/assets/textures/val${i}-tex/`);
        }

        // Exit code: 1 when anything was refused, 0 otherwise.
        expect(r.exitCode).toBe(bad.length > 0 ? 1 : 0);
      }),
      { numRuns: 30 },
    );
  }, 240000);
});
