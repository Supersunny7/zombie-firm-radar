import type { FirmStatus } from '../../types/data';

const NA = 'n/a';

const STATUS_LABELS: Record<FirmStatus, { text: string; glyph: string }> = {
  zombie: { text: 'Zombie', glyph: '✝' },
  endangered: { text: 'Endangered', glyph: '▲' },
  healthy: { text: 'Healthy', glyph: '●' },
  insufficient_data: { text: 'Not enough data', glyph: '○' },
};

/** Text and glyph for a status; the glyph never stands alone (colour is never the only signal). */
export function statusLabel(s: FirmStatus): { text: string; glyph: string } {
  return STATUS_LABELS[s];
}

/** Four-digit year ("2001"); "n/a" for null or anything that is not a year 1000 to 9999. */
export function formatYear(v: number | null): string {
  if (v === null || !Number.isInteger(v) || v < 1000 || v > 9999) return NA;
  return String(v);
}

/** ICR with two decimals; never "-0.00". */
export function formatIcr(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return NA;
  // toFixed switches to exponent notation at 1e21; such doubles are integers.
  const s = Math.abs(v) >= 1e21 ? `${BigInt(v).toString()}.00` : v.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

const UNITS: readonly { size: number; suffix: string }[] = [
  { size: 1e3, suffix: 'K' },
  { size: 1e6, suffix: 'M' },
  { size: 1e9, suffix: 'B' },
  { size: 1e12, suffix: 'T' },
];

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** USD with "$", unit chosen after rounding (999,950 → "$1.0M"). Negatives get a leading "-". */
export function formatDebt(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return NA;
  const abs = Math.abs(v);
  const whole = Math.round(abs);
  let body: string;
  if (whole < 1e3) {
    body = `$${whole}`;
  } else {
    let i = 0;
    for (let k = UNITS.length - 1; k >= 0; k--) {
      if (abs >= (UNITS[k] as { size: number }).size) {
        i = k;
        break;
      }
    }
    let unit = UNITS[i] as { size: number; suffix: string };
    let scaled = round1(abs / unit.size);
    while (scaled >= 1000 && i < UNITS.length - 1) {
      i += 1;
      unit = UNITS[i] as { size: number; suffix: string };
      scaled = round1(abs / unit.size);
    }
    body = `$${scaled.toFixed(1)}${unit.suffix}`;
  }
  return v < 0 && body !== '$0' ? `-${body}` : body;
}
