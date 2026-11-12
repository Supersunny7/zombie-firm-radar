// Small pure parser for the CREDITS.md format: headings, paragraphs and one asset table
// with columns | Path | Title | Author | Source URL | License | Changes we made |.
// Anything it cannot parse becomes a plain text block.

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string };

export interface CreditsEntry {
  type: 'entry';
  title: string;
  author: string;
  license: string;
  /** Plain text of the source cell, shown when there is no safe link. */
  sourceText: string;
  /** http(s) URL only, otherwise null. */
  sourceUrl: string | null;
  changes: Inline[];
}

export type CreditsBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'text'; inline: Inline[] }
  | CreditsEntry;

const ENTRY_COLUMNS = 6;

export function isSafeUrl(url: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(url.trim());
}

/** Parses [text](url) links and `code` spans. Unsafe link targets stay plain text. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\[([^\]]*)\]\(([^)\s]*)\)|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (t: string): void => {
    if (t) out.push({ kind: 'text', text: t });
  };
  while ((m = re.exec(src)) !== null) {
    pushText(src.slice(last, m.index));
    if (m[3] !== undefined) out.push({ kind: 'code', text: m[3] });
    else if (isSafeUrl(m[2] ?? ''))
      out.push({ kind: 'link', text: m[1] || (m[2] ?? ''), url: m[2] ?? '' });
    else pushText(m[1] ?? '');
    last = m.index + m[0].length;
  }
  pushText(src.slice(last));
  return out;
}

function inlineToText(parts: Inline[]): string {
  return parts.map((p) => p.text).join('');
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function sourceOf(cell: string): { text: string; url: string | null } {
  const parts = parseInline(cell);
  const link = parts.find((p) => p.kind === 'link');
  if (link && link.kind === 'link') return { text: inlineToText(parts), url: link.url };
  const bare = cell.trim();
  return { text: bare, url: isSafeUrl(bare) ? bare : null };
}

export function parseCredits(markdown: string): CreditsBlock[] {
  const blocks: CreditsBlock[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]!.length,
        text: inlineToText(parseInline(heading[2]!)),
      });
      continue;
    }

    if (line.startsWith('|')) {
      const cells = splitRow(line);
      if (isSeparatorRow(cells)) continue;
      if (cells.length === ENTRY_COLUMNS) {
        if (cells[0]!.toLowerCase() === 'path') continue; // table header
        const src = sourceOf(cells[3]!);
        blocks.push({
          type: 'entry',
          title: inlineToText(parseInline(cells[1]!)),
          author: inlineToText(parseInline(cells[2]!)),
          license: inlineToText(parseInline(cells[4]!)),
          sourceText: src.text,
          sourceUrl: src.url,
          changes: parseInline(cells[5]!),
        });
        continue;
      }
      if (cells.length === 1 && cells[0]!.toLowerCase() === 'path') continue;
    }

    blocks.push({ type: 'text', inline: parseInline(line) });
  }
  return blocks;
}
