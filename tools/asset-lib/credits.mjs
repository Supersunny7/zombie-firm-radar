// CREDITS.md management (design: "Credits management"; Requirements 18, 22).
// parseCredits, upsertCreditRows, ensureCmuLine, ensureServicesLine, ensureVisibleNote and
// renderRow are pure. writeCredits is the only function that touches the file system.
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CREDITS_FILE, REPO_ROOT } from './paths.mjs';

export const COLUMNS = ['Path', 'Title', 'Author', 'Source URL', 'License', 'Changes we made'];
export const CMU_SENTENCE =
  'The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.';
export const POLYHAVEN_SENTENCE =
  'Powered by Poly Haven (polyhaven.com), CC0 assets via the Poly Haven API.';
export const VISIBLE_HEADING = '## Visible in app';
export const VISIBLE_BODY =
  "The content of this file is shown in the Credits button of the Settings menu in the app. That UI is delivered by the graveyard-scene spec. This note is required because Poly Haven's terms need a visible credit.";
export const ROCKETBOX_LICENSE_TITLE = 'Microsoft Rocketbox LICENSE';

// ---------------------------------------------------------------- line helpers

/** Split into lines that keep their own line ending. */
function splitLines(text) {
  return text.match(/[^\r\n]*(?:\r\n|\n|\r)|[^\r\n]+$/g) ?? [];
}
const bodyOf = (line) => line.replace(/\r\n$|\n$|\r$/, '');
const eolOf = (line) => line.slice(bodyOf(line).length);
function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}
const isHeading12 = (line) => /^#{1,2} /.test(bodyOf(line));
const withEol = (line, eol) => (eolOf(line) === '' ? line + eol : line);

// ---------------------------------------------------------------- cells

/** Escape one cell: `|` becomes `\|`, newlines become spaces. */
export function escapeCell(value) {
  return String(value).replace(/\r\n|\r|\n/g, ' ').replace(/\|/g, '\\|');
}

/** Split a table line into unescaped cells. */
export function parseRow(line) {
  let s = bodyOf(line).trim();
  if (s.startsWith('|')) s = s.slice(1);
  const cells = [];
  let cur = '';
  let closed = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (ch === '|') {
      cells.push(cur.trim());
      cur = '';
      closed = true;
    } else {
      cur += ch;
      closed = false;
    }
  }
  if (cur.trim() !== '' || !closed) cells.push(cur.trim());
  return cells;
}

export function renderRow(cells) {
  return `| ${cells.map(escapeCell).join(' | ')} |`;
}

const HEADER_CELLS = COLUMNS.join('|');
const isHeaderLine = (line) => {
  const t = bodyOf(line).trim();
  return t.startsWith('|') && parseRow(line).join('|') === HEADER_CELLS;
};
const isSeparatorLine = (line) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(bodyOf(line).trim());
const isTableLine = (line) => bodyOf(line).trim().startsWith('|');

/** Locate the credits table: { header, start, end } (line indexes, end exclusive) or null. */
export function parseCredits(markdown) {
  const lines = splitLines(markdown);
  for (let i = 0; i < lines.length - 1; i++) {
    if (isHeaderLine(lines[i]) && isSeparatorLine(lines[i + 1])) {
      let end = i + 2;
      while (end < lines.length && isTableLine(lines[end])) end++;
      const rows = [];
      for (let k = i + 2; k < end; k++) {
        const cells = parseRow(lines[k]).slice(0, 6);
        while (cells.length < 6) cells.push('');
        rows.push(cells);
      }
      return { lines, headerIndex: i, bodyStart: i + 2, end, rows };
    }
  }
  return null;
}

/** Make a CreditRow from a pick's `credits` object. */
export function rowFromCredits(rowPath, credits) {
  return {
    path: rowPath,
    title: credits.title,
    author: credits.author,
    sourceUrl: credits.sourceUrl,
    license: credits.license,
    changes: credits.changes,
  };
}

const rowToCells = (r) => [r.path, r.title, r.author, r.sourceUrl, r.license, r.changes];

function assertRow(r) {
  const cells = rowToCells(r);
  cells.forEach((c, i) => {
    if (typeof c !== 'string' || c.trim() === '') {
      throw new Error(`credits row for ${JSON.stringify(r?.path)}: empty or invalid ${COLUMNS[i]}`);
    }
  });
}

/**
 * Upsert rows into the table under `## Assets`. One row per Path (later duplicates win),
 * rows sorted by Path ordinal, text outside the table byte for byte.
 * `exists(path)` (optional) adds a warning for rows whose file is gone; rows are never deleted.
 */
export function upsertCreditRows(markdown, rows, { exists } = {}) {
  const warnings = [];
  for (const r of rows) assertRow(r);
  const eol = detectEol(markdown);
  const parsed = parseCredits(markdown);
  const map = new Map();
  if (parsed) for (const cells of parsed.rows) map.set(cells[0], cells);
  for (const r of rows) map.set(r.path.trim(), rowToCells(r).map((c) => c.trim()));
  if (exists) {
    for (const p of map.keys()) {
      if (!exists(p)) warnings.push(`CREDITS.md row for missing file: ${p}`);
    }
  }
  const sorted = [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const rendered = sorted.map(([, cells]) => renderRow(cells));

  if (!parsed) {
    if (rendered.length === 0) return { markdown, warnings };
    const tableLines = [renderRow(COLUMNS), '| --- | --- | --- | --- | --- | --- |', ...rendered];
    let base = markdown;
    if (base !== '' && !/[\r\n]$/.test(base)) base += eol;
    const lead = base === '' ? '' : eol;
    return {
      markdown: `${base}${lead}## Assets${eol}${tableLines.join(eol)}${eol}`,
      warnings,
    };
  }

  const lastHadEol = parsed.end > parsed.bodyStart ? eolOf(parsed.lines[parsed.end - 1]) !== '' : true;
  const before = parsed.lines.slice(0, parsed.bodyStart).join('');
  const after = parsed.lines.slice(parsed.end).join('');
  let table = rendered.join(eol);
  if (rendered.length > 0 && (lastHadEol || after !== '')) table += eol;
  let head = before;
  if (rendered.length === 0 && head !== '' && !/[\r\n]$/.test(head)) head += eol;
  return { markdown: head + table + after, warnings };
}

// ---------------------------------------------------------------- sentence lines

/**
 * Make sure `sentence` appears exactly once (when `used`), under `heading`.
 * Extra copies are removed; the section is added at the end of the file when missing.
 */
function ensureSentence(markdown, heading, sentence, used) {
  if (!used) return markdown;
  const eol = detectEol(markdown);
  const lines = splitLines(markdown);
  const hits = [];
  lines.forEach((l, i) => {
    if (bodyOf(l).includes(sentence)) hits.push(i);
  });
  if (hits.length === 1) return markdown;
  if (hits.length > 1) {
    const drop = new Set(hits.slice(1));
    return lines.filter((_, i) => !drop.has(i)).join('');
  }
  const h = lines.findIndex((l) => bodyOf(l).trim() === heading);
  if (h === -1) {
    let base = markdown;
    if (base !== '' && !/[\r\n]$/.test(base)) base += eol;
    return `${base}${base === '' ? '' : eol}${heading}${eol}${sentence}${eol}`;
  }
  let end = h + 1;
  while (end < lines.length && !isHeading12(lines[end])) end++;
  let last = end - 1;
  while (last > h && bodyOf(lines[last]).trim() === '') last--;
  const out = lines.slice(0, last);
  out.push(withEol(lines[last], eol), sentence + (last + 1 < lines.length ? eol : eol));
  out.push(...lines.slice(last + 1));
  return out.join('');
}

/** CMU credit line under `## Motion capture`, exactly once when CMU clips are used. */
export function ensureCmuLine(markdown, used = true) {
  return ensureSentence(markdown, '## Motion capture', CMU_SENTENCE, used);
}

/** Poly Haven credit line under `## Services`, exactly once when Poly Haven picks are used. */
export function ensureServicesLine(markdown, used = true) {
  return ensureSentence(markdown, '## Services', POLYHAVEN_SENTENCE, used);
}

// ---------------------------------------------------------------- visible note

/**
 * Exactly one `## Visible in app` section with the fixed body, as the first section
 * (directly after a leading `# title` and its intro text). Other text is untouched.
 */
export function ensureVisibleNote(markdown) {
  const eol = detectEol(markdown);
  const lines = splitLines(markdown);
  const canonical = `${VISIBLE_HEADING}\n${VISIBLE_BODY}`;
  // Find note sections: heading line to next level 1 or 2 heading.
  const notes = [];
  for (let i = 0; i < lines.length; i++) {
    if (bodyOf(lines[i]).trimEnd() === VISIBLE_HEADING) {
      let end = i + 1;
      while (end < lines.length && !isHeading12(lines[end])) end++;
      notes.push({ start: i, end });
      i = end - 1;
    }
  }
  const kept = [];
  let pos = 0;
  for (const n of notes) {
    kept.push(...lines.slice(pos, n.start));
    pos = n.end;
  }
  kept.push(...lines.slice(pos));

  // Insertion index in `kept`.
  let idx = 0;
  if (kept.length > 0 && /^# /.test(bodyOf(kept[0]))) {
    idx = kept.length;
    for (let i = 1; i < kept.length; i++) {
      if (/^## /.test(bodyOf(kept[i]))) {
        idx = i;
        break;
      }
    }
  }

  if (notes.length === 1 && notes[0].start === idx) {
    const text = lines
      .slice(notes[0].start, notes[0].end)
      .map(bodyOf)
      .join('\n')
      .replace(/\s+$/, '');
    if (text === canonical) return markdown;
  }

  const before = kept.slice(0, idx);
  if (before.length > 0) before[before.length - 1] = withEol(before[before.length - 1], eol);
  const block = `${VISIBLE_HEADING}${eol}${VISIBLE_BODY}${eol}${idx < kept.length ? eol : ''}`;
  return before.join('') + block + kept.slice(idx).join('');
}

// ---------------------------------------------------------------- warnings

/** Warn about Rocketbox avatar rows without a "Microsoft Rocketbox LICENSE" row in the same folder. */
export function rocketboxLicenseWarnings(rows) {
  const warnings = [];
  const licenseDirs = new Set(
    rows.filter((r) => r.title === ROCKETBOX_LICENSE_TITLE).map((r) => path.posix.dirname(r.path)),
  );
  for (const r of rows) {
    if (r.title === ROCKETBOX_LICENSE_TITLE) continue;
    if (/\/avatars\//.test(r.path) && /microsoft\/rocketbox/i.test(r.sourceUrl ?? '')) {
      if (!licenseDirs.has(path.posix.dirname(r.path))) {
        warnings.push(`Rocketbox LICENSE row missing next to ${r.path}`);
      }
    }
  }
  return warnings;
}

// ---------------------------------------------------------------- writer

/**
 * Apply rows and fixed lines to CREDITS.md and write it atomically (temp file + rename).
 * Rows whose file does not exist are skipped with a warning (Requirement 18.3).
 * Does nothing when the result equals the current content.
 */
export async function writeCredits({
  rows,
  usesCmu = false,
  usesPolyHaven = false,
  file = CREDITS_FILE,
  root = REPO_ROOT,
  exists = async (p) => access(path.join(root, p)).then(() => true, () => false),
} = {}) {
  const warnings = [];
  const present = [];
  for (const r of rows ?? []) {
    if (await exists(r.path)) present.push(r);
    else warnings.push(`skipped credits row, file does not exist: ${r.path}`);
  }
  warnings.push(...rocketboxLicenseWarnings(present));

  let current = '';
  try {
    current = await readFile(file, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const up = upsertCreditRows(current, present);
  warnings.push(...up.warnings);
  let next = ensureCmuLine(up.markdown, usesCmu);
  next = ensureServicesLine(next, usesPolyHaven);
  next = ensureVisibleNote(next);
  if (next === current) return { changed: false, warnings };

  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, next, 'utf8');
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
  return { changed: true, warnings };
}
