/**
 * Pure engraving text layout (design Section 5, requirements 5.1, 5.7).
 * No canvas: widths are estimated, so the result is deterministic everywhere.
 */
import { formatIcr, formatYear } from '../../../ui/table/format';

export interface EngravingInput {
  name: string;
  firstFilingYear: number | null;
  icr: number | null;
}

export interface EngravingLayout {
  /** One or two name lines. */
  nameLines: string[];
  /** Font size in px for the name lines. */
  namePx: number;
  year: string;
  icrText: string;
}

export const NAME_BASE_PX = 28;
export const NAME_MIN_PX = 16;
/** Average glyph advance as a fraction of font size (serif display face). */
export const CHAR_WIDTH_EM = 0.5;
export const ELLIPSIS = '\u2026';
export const MAX_NAME_LINES = 2;

function estWidth(text: string, px: number): number {
  return Array.from(text).length * px * CHAR_WIDTH_EM;
}

/** Greedy word wrap into at most `maxLines` lines; null if it does not fit. */
function wrap(words: string[], px: number, maxWidth: number): string[] | null {
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (estWidth(next, px) <= maxWidth) {
      cur = next;
    } else {
      if (!cur || estWidth(w, px) > maxWidth) return null;
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length <= MAX_NAME_LINES ? lines : null;
}

/** Hard-truncates to the widest prefix that fits with an ellipsis. */
function truncate(text: string, px: number, maxWidth: number): string {
  if (estWidth(text, px) <= maxWidth) return text;
  const chars = Array.from(text);
  let n = Math.max(0, Math.floor(maxWidth / (px * CHAR_WIDTH_EM)) - 1);
  n = Math.min(n, chars.length);
  return chars.slice(0, n).join('').trimEnd() + ELLIPSIS;
}

/** Fits a firm name into at most two lines, shrinking from 28 px to 16 px, then truncating. */
export function fitName(name: string, maxWidth: number): { lines: string[]; px: number } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [''], px: NAME_BASE_PX };
  for (let px = NAME_BASE_PX; px >= NAME_MIN_PX; px -= 2) {
    const lines = wrap(words, px, maxWidth);
    if (lines) return { lines, px };
  }
  // Does not fit even at the minimum size: fill line 1 greedily, truncate the rest into line 2.
  const px = NAME_MIN_PX;
  const first: string[] = [];
  let used = 0;
  for (const w of words) {
    const cand = first.length ? `${first.join(' ')} ${w}` : w;
    if (estWidth(cand, px) > maxWidth) break;
    first.push(w);
    used++;
  }
  if (first.length === 0) return { lines: [truncate(words.join(' '), px, maxWidth)], px };
  const rest = words.slice(used).join(' ');
  return {
    lines: [first.join(' '), truncate(rest, px, maxWidth)],
    px,
  };
}

export function engravingText(input: EngravingInput, maxWidth: number): EngravingLayout {
  const { lines, px } = fitName(input.name, maxWidth);
  return {
    nameLines: lines,
    namePx: px,
    year: formatYear(input.firstFilingYear),
    icrText: `ICR ${formatIcr(input.icr)}`,
  };
}
