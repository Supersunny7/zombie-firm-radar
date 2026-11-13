// Feature: asset-pipeline, Property 5: Credits table has exactly one row per file and is stable
// Validates: Requirements 18.2, 18.3, 18.4
// Pure string tests on upsertCreditRows; the real CREDITS.md is never read or written.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { COLUMNS, escapeCell, parseCredits, parseRow, renderRow, upsertCreditRows } from './credits.mjs';

const NUM_RUNS = 150;
const norm = (v) => v.trim().replace(/\r\n|\r|\n/g, ' ');

// Cells: any string with at least one non-space char, pipes, backslashes and newlines included.
const cell = fc
  .string({ unit: fc.constantFrom('a', 'Z', '0', ' ', '|', '\\', '\n', '\r', '\u00e9', '-', ':', '/', '.'), maxLength: 12 })
  .filter((s) => s.trim() !== '');
// Paths come from a small pool plus noise, so duplicates are frequent. No newlines in paths.
const pathCell = fc.oneof(
  fc.constantFrom('web/public/assets/a/x.glb', 'web/public/assets/a|b/y.glb', 'web/public/assets/c/z.hdr'),
  fc.string({ unit: fc.constantFrom('a', 'b', '|', '\\', '/', ' ', '.'), maxLength: 8 }).filter((s) => s.trim() !== ''),
);
const cells6 = fc.tuple(pathCell, cell, cell, cell, cell, cell);
const newRow = cells6.map(([path, title, author, sourceUrl, license, changes]) => ({
  path, title, author, sourceUrl, license, changes,
}));
// Free text lines with no pipes, so they can never look like table lines.
const textLine = fc.string({ unit: fc.constantFrom('a', 'B', '1', ' ', '.', ','), maxLength: 20 });
const prefixText = fc.array(textLine, { maxLength: 4 }).map((ls) => `# Credits\n${ls.join('\n')}\n\n## Assets\n`);
const suffixText = fc.oneof(
  fc.constant(''),
  fc.array(textLine, { maxLength: 4 }).map((ls) => `\n## Notes\n${ls.join('\n')}\n`),
);

const buildDoc = (prefix, rows, suffix) =>
  `${prefix}${renderRow(COLUMNS)}\n| --- | --- | --- | --- | --- | --- |\n${rows.map(renderRow).join('\n')}${rows.length ? '\n' : ''}${suffix}`;

const docArb = fc.record({ prefix: prefixText, existing: fc.array(cells6, { maxLength: 6 }), suffix: suffixText });

// Fixtures: the six graveyard-horror-pass picks (4 Sketchfab characters, 2 growls) from tools/picks.json.
const SIX_NEW_IDS = [
  'sketchfab-hooded-horror-woman-purplepoint',
  'sketchfab-possessed-undead-giantswing',
  'sketchfab-zombie-pxltiger',
  'sketchfab-zombie-walk-oscar',
  'freesound-ezcah-zombie-growl-01',
  'freesound-tonsil5-zombie-growl-5',
];
const sixRows = () => {
  const picks = JSON.parse(readFileSync(new URL('../picks.json', import.meta.url), 'utf8')).picks;
  return SIX_NEW_IDS.map((id) => {
    const p = picks.find((x) => x.id === id);
    const ext = p.kind === 'audio' ? 'ogg' : 'glb';
    return {
      path: `web/public/assets/${p.kind === 'audio' ? 'audio' : 'models'}/${id}.${ext}`,
      title: p.credits.title,
      author: p.credits.author,
      sourceUrl: p.credits.sourceUrl,
      license: p.credits.license,
      changes: p.credits.changes,
    };
  });
};

describe('Property 5: credits table with the six new picks', () => {
  it('adds one row per new pick to any existing table, keeps outside text, and is idempotent', () => {
    const rows = sixRows();
    fc.assert(
      fc.property(docArb, ({ prefix, existing, suffix }) => {
        const doc = buildDoc(prefix, existing, suffix);
        const { markdown: out } = upsertCreditRows(doc, rows);
        expect(out.startsWith(prefix)).toBe(true);
        expect(out.endsWith(suffix)).toBe(true);
        const paths = parseCredits(out).rows.map((r) => r[0]);
        expect(new Set(paths).size).toBe(paths.length);
        for (const r of rows) expect(paths.filter((p) => p === r.path)).toHaveLength(1);
        expect(upsertCreditRows(out, rows).markdown).toBe(out);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 5: credits table (one row per Path, stable)', () => {
  it('has one row per Path, new rows win with no empty cell, outside text preserved, upsert idempotent', () => {
    fc.assert(
      fc.property(docArb, fc.array(newRow, { maxLength: 6 }), ({ prefix, existing, suffix }, rows) => {
        const doc = buildDoc(prefix, existing, suffix);
        const { markdown: out } = upsertCreditRows(doc, rows);

        // Text outside the table is unchanged byte for byte.
        expect(out.startsWith(prefix)).toBe(true);
        expect(out.endsWith(suffix)).toBe(true);

        const parsed = parseCredits(out);
        expect(parsed).not.toBeNull();
        const paths = parsed.rows.map((r) => r[0]);
        expect(new Set(paths).size).toBe(paths.length);

        // Expected content: last occurrence wins, new rows over existing ones.
        const expected = new Map();
        for (const c of existing) expected.set(c[0].trim(), c.map(norm));
        for (const r of rows) {
          expected.set(r.path.trim(), [r.path, r.title, r.author, r.sourceUrl, r.license, r.changes].map(norm));
        }
        expect(paths.length).toBe(expected.size);
        for (const cells of parsed.rows) {
          expect(cells.every((c) => c !== '')).toBe(true);
          expect(cells).toEqual(expected.get(cells[0]));
        }

        // Idempotent: second upsert returns the same document.
        expect(upsertCreditRows(out, rows).markdown).toBe(out);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('escapes pipes and newlines so a rendered row parses back to the same cells', () => {
    fc.assert(
      fc.property(fc.array(cell, { minLength: 6, maxLength: 6 }), (cells) => {
        const line = renderRow(cells);
        expect(line.includes('\n')).toBe(false);
        expect(parseRow(line)).toEqual(cells.map(norm));
        expect(escapeCell(cells[0]).replace(/\\\|/g, '')).not.toContain('|');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects rows with an empty cell', () => {
    fc.assert(
      fc.property(newRow, fc.constantFrom(...COLUMNS.map((_, i) => i)), fc.constantFrom('', '  ', '\n'), (row, i, blank) => {
        const keys = ['path', 'title', 'author', 'sourceUrl', 'license', 'changes'];
        expect(() => upsertCreditRows('', [{ ...row, [keys[i]]: blank }])).toThrow();
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
