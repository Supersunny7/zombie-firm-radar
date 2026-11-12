import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CMU_SENTENCE,
  POLYHAVEN_SENTENCE,
  VISIBLE_BODY,
  VISIBLE_HEADING,
  ensureCmuLine,
  ensureServicesLine,
  ensureVisibleNote,
  escapeCell,
  parseCredits,
  parseRow,
  renderRow,
  upsertCreditRows,
  writeCredits,
} from './credits.mjs';

const HEADER = '| Path | Title | Author | Source URL | License | Changes we made |\n| --- | --- | --- | --- | --- | --- |\n';
const BASE = `# Credits\nRules text.\n## Assets\nEvery file has one row.\n${HEADER}## Motion capture\n${CMU_SENTENCE}\n## Fonts\nFonts text.\n`;
const row = (p, over = {}) => ({
  path: p,
  title: 'T',
  author: 'A',
  sourceUrl: 'https://x.test/a',
  license: 'CC0',
  changes: 'None',
  ...over,
});
const count = (s, sub) => s.split(sub).length - 1;

describe('cells', () => {
  it('escapes pipes and newlines and round-trips', () => {
    expect(escapeCell('a|b\nc')).toBe('a\\|b c');
    const cells = ['p', 'a|b', 'x\\|y', 'd', 'e', 'f'];
    expect(parseRow(renderRow(cells))).toEqual(cells);
  });
});

describe('upsertCreditRows', () => {
  it('inserts sorted rows and keeps text outside the table byte for byte', () => {
    const { markdown } = upsertCreditRows(BASE, [row('web/public/assets/b'), row('web/public/assets/a')]);
    const t = parseCredits(markdown);
    expect(t.rows.map((r) => r[0])).toEqual(['web/public/assets/a', 'web/public/assets/b']);
    expect(markdown.startsWith('# Credits\nRules text.\n## Assets\nEvery file has one row.\n')).toBe(true);
    expect(markdown.endsWith('## Motion capture\n' + CMU_SENTENCE + '\n## Fonts\nFonts text.\n')).toBe(true);
  });

  it('is idempotent and replaces rows by path without duplicates', () => {
    const once = upsertCreditRows(BASE, [row('p/a'), row('p/b')]).markdown;
    expect(upsertCreditRows(once, [row('p/a'), row('p/b')]).markdown).toBe(once);
    const changed = upsertCreditRows(once, [row('p/a', { title: 'New|Title' })]).markdown;
    const rows = parseCredits(changed).rows;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r[0] === 'p/a')[1]).toBe('New|Title');
    expect(changed).toContain('New\\|Title');
  });

  it('collapses duplicate existing paths and preserves other rows', () => {
    const md = BASE.replace(HEADER, HEADER + '| p/z | Z | Zed | u | MIT | c |\n| p/z | Z2 | Zed | u | MIT | c |\n');
    const { markdown } = upsertCreditRows(md, [row('p/a')]);
    const rows = parseCredits(markdown).rows;
    expect(rows.map((r) => r[0])).toEqual(['p/a', 'p/z']);
    expect(rows[1][1]).toBe('Z2');
  });

  it('rejects empty cells and warns on missing files', () => {
    expect(() => upsertCreditRows(BASE, [row('p/a', { author: ' ' })])).toThrow(/Author/);
    const out = upsertCreditRows(BASE, [row('p/a')], { exists: () => false });
    expect(out.warnings[0]).toMatch(/p\/a/);
    expect(parseCredits(out.markdown).rows).toHaveLength(1);
  });

  it('preserves CRLF and creates a table when absent', () => {
    const crlf = BASE.replace(/\n/g, '\r\n');
    expect(upsertCreditRows(crlf, [row('p/a')]).markdown).not.toMatch(/[^\r]\n/);
    const made = upsertCreditRows('# Credits\n', [row('p/a')]).markdown;
    expect(parseCredits(made).rows).toHaveLength(1);
  });
});

describe('fixed lines', () => {
  it('CMU line appears exactly once and only when used', () => {
    expect(ensureCmuLine(BASE, false)).toBe(BASE);
    expect(ensureCmuLine(BASE)).toBe(BASE);
    const none = BASE.replace(CMU_SENTENCE + '\n', '');
    const added = ensureCmuLine(none);
    expect(count(added, CMU_SENTENCE)).toBe(1);
    expect(ensureCmuLine(added)).toBe(added);
    const triple = BASE.replace(CMU_SENTENCE + '\n', `${CMU_SENTENCE}\n${CMU_SENTENCE}\n${CMU_SENTENCE}\n`);
    expect(count(ensureCmuLine(triple), CMU_SENTENCE)).toBe(1);
    expect(count(ensureCmuLine('# Credits\n'), CMU_SENTENCE)).toBe(1);
  });

  it('Poly Haven line is added once under Services', () => {
    const a = ensureServicesLine(BASE);
    expect(count(a, POLYHAVEN_SENTENCE)).toBe(1);
    expect(a).toContain('## Services\n' + POLYHAVEN_SENTENCE);
    expect(ensureServicesLine(a)).toBe(a);
  });
});

describe('ensureVisibleNote', () => {
  it('inserts the note once as the first section, after the title and intro', () => {
    const out = ensureVisibleNote(BASE);
    expect(count(out, VISIBLE_HEADING)).toBe(1);
    expect(out.startsWith(`# Credits\nRules text.\n${VISIBLE_HEADING}\n${VISIBLE_BODY}\n\n## Assets`)).toBe(true);
    expect(ensureVisibleNote(out)).toBe(out);
  });

  it('puts the note at the top without a title', () => {
    const out = ensureVisibleNote('## Assets\nx\n');
    expect(out.startsWith(VISIBLE_HEADING)).toBe(true);
    expect(out.endsWith('## Assets\nx\n')).toBe(true);
  });

  it('dedupes, repairs and moves a misplaced note', () => {
    const note = `${VISIBLE_HEADING}\nold text\n\n`;
    const messy = `# Credits\n## Assets\nrow\n${note}## Fonts\nf\n${note}`;
    const out = ensureVisibleNote(messy);
    expect(count(out, VISIBLE_HEADING)).toBe(1);
    expect(out).not.toContain('old text');
    expect(out.indexOf(VISIBLE_HEADING)).toBeLessThan(out.indexOf('## Assets'));
    expect(out).toContain('## Assets\nrow\n## Fonts\nf\n');
    expect(ensureVisibleNote(out)).toBe(out);
  });

  it('preserves CRLF and handles a missing final newline', () => {
    const out = ensureVisibleNote('# Credits\r\n## Assets\r\nx');
    expect(out).not.toMatch(/[^\r]\n/);
    expect(out.endsWith('## Assets\r\nx')).toBe(true);
  });
});

describe('writeCredits', () => {
  it('writes atomically, skips missing files and is idempotent', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'credits-'));
    try {
      const file = path.join(dir, 'CREDITS.md');
      await writeFile(file, BASE);
      await mkdir(path.join(dir, 'web/public/assets/models/m'), { recursive: true });
      await writeFile(path.join(dir, 'web/public/assets/models/m/m.glb'), 'x');
      const rows = [row('web/public/assets/models/m/m.glb'), row('web/public/assets/models/gone.glb')];
      const first = await writeCredits({ rows, usesPolyHaven: true, file, root: dir });
      expect(first.changed).toBe(true);
      expect(first.warnings.join()).toMatch(/gone\.glb/);
      const text = await readFile(file, 'utf8');
      expect(parseCredits(text).rows).toHaveLength(1);
      expect(count(text, VISIBLE_HEADING)).toBe(1);
      expect(count(text, POLYHAVEN_SENTENCE)).toBe(1);
      const second = await writeCredits({ rows, usesPolyHaven: true, file, root: dir });
      expect(second.changed).toBe(false);
      expect(await readFile(file, 'utf8')).toBe(text);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
