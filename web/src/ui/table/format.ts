const NA = 'n/a';

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
