/**
 * Interest coverage ratio: EBIT / interest.
 * The only coverage division in the engine. Never throws.
 * Returns null when EBIT is not a number (or NaN), or when interest is not a
 * finite positive number.
 */
export function icr(
  ebit: number | null | undefined,
  interest: number | null | undefined,
): number | null {
  if (typeof ebit !== 'number' || Number.isNaN(ebit)) return null;
  if (typeof interest !== 'number' || !Number.isFinite(interest) || !(interest > 0)) return null;
  return ebit / interest;
}
