// Feature: asset-pipeline, Property 16: Visible-in-app note is first, unique and preserved
// **Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5**
// Pure string tests; the real CREDITS.md is never read or written.
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  VISIBLE_HEADING,
  VISIBLE_BODY,
  ensureVisibleNote,
  upsertCreditRows,
  ensureCmuLine,
  ensureServicesLine,
} from './credits.mjs';

const CANON = `${VISIBLE_HEADING}\n${VISIBLE_BODY}\n`;

// Plain text lines: never start with '#' or '|', never blank-only, never the CMU/Poly Haven sentences.
const plainLine = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 .,:;_-]{0,30}$/);
const plainLines = fc.array(plainLine, { maxLength: 4 }).map((l) => l.map((x) => `${x}\n`).join(''));

const otherBlock = fc
  .tuple(fc.stringMatching(/^[A-Za-z0-9]{1,10}$/), plainLines)
  .map(([name, body]) => ({ note: false, text: `## Sec ${name}\n${body}` }));
const noteBlock = plainLines.chain((alt) =>
  fc.boolean().map((canonical) => ({
    note: true,
    text: `${VISIBLE_HEADING}\n${canonical ? VISIBLE_BODY + '\n' : alt}`,
  })),
);

const docArb = fc
  .tuple(
    fc.option(fc.stringMatching(/^[A-Za-z0-9 ]{1,10}$/), { nil: undefined }),
    plainLines,
    fc.array(fc.oneof(otherBlock, noteBlock), { maxLength: 6 }),
  )
  .map(([title, preText, blocks]) => {
    // Intro text only follows a "# title"; without a title it would sit above the first
    // section and (by design) become part of the note's section when the note goes on top.
    const head = title === undefined ? '' : `# ${title}\n${preText}`;
    return {
      input: head + blocks.map((b) => b.text).join(''),
      kept: head + blocks.filter((b) => !b.note).map((b) => b.text).join(''),
    };
  });

const headingLines = (s) => s.split('\n').filter((l) => /^#{1,2} /.test(l));

/** Note section text of `md`: the heading line to the next level 1 or 2 heading. */
function noteSection(md) {
  const lines = md.split('\n');
  const i = lines.indexOf(VISIBLE_HEADING);
  let end = i + 1;
  while (end < lines.length && !/^#{1,2} /.test(lines[end])) end++;
  return lines.slice(i, end).join('\n').replace(/\s+$/, '');
}

function assertNoteOk(out) {
  expect(out.split('\n').filter((l) => l === VISIBLE_HEADING)).toHaveLength(1);
  const level2 = out.split('\n').filter((l) => /^## /.test(l));
  expect(level2[0]).toBe(VISIBLE_HEADING);
  expect(noteSection(out)).toBe(`${VISIBLE_HEADING}\n${VISIBLE_BODY}`);
}

describe('Property 16: Visible-in-app note is first, unique and preserved', () => {
  it('is first, unique, fixed body, other text unchanged, and idempotent', () => {
    fc.assert(
      fc.property(docArb, ({ input, kept }) => {
        const out = ensureVisibleNote(input);
        assertNoteOk(out);
        // Remove the note block; the rest must equal the input without any note sections.
        const at = out.indexOf(CANON);
        expect(at).toBeGreaterThanOrEqual(0);
        let rest = out.slice(at + CANON.length);
        // A blank separator line is added after the block; an already-correct note keeps its
        // original spacing. Generated text never starts with a blank line.
        if (rest.startsWith('\n')) rest = rest.slice(1);
        expect(out.slice(0, at) + rest).toBe(kept);
        // Headings other than the note keep their order.
        expect(headingLines(out).filter((l) => l !== VISIBLE_HEADING)).toEqual(
          headingLines(kept),
        );
        // Twice equals once.
        expect(ensureVisibleNote(out)).toBe(out);
      }),
      { numRuns: 200 },
    );
  });

  it('stays unchanged, first and unique after any sequence of credits updates', () => {
    const rowArb = fc
      .tuple(...Array.from({ length: 6 }, () => fc.stringMatching(/^[a-z0-9]{1,8}$/)))
      .map(([p, title, author, url, license, changes]) => ({
        path: `assets/${p}`,
        title,
        author,
        sourceUrl: url,
        license,
        changes,
      }));
    const stepArb = fc.oneof(
      fc.array(rowArb, { maxLength: 4 }).map((rows) => (md) => upsertCreditRows(md, rows).markdown),
      fc.boolean().map((u) => (md) => ensureCmuLine(md, u)),
      fc.boolean().map((u) => (md) => ensureServicesLine(md, u)),
    );
    fc.assert(
      fc.property(docArb, fc.array(stepArb, { minLength: 1, maxLength: 6 }), ({ input }, steps) => {
        let md = ensureVisibleNote(input);
        for (const step of steps) {
          md = step(md);
          assertNoteOk(md);
        }
        expect(ensureVisibleNote(md)).toBe(md);
      }),
      { numRuns: 200 },
    );
  });
});
