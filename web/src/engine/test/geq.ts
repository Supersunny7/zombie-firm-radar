/** a >= b within relative tolerance; Infinity handled without NaN. */
export const geq = (a: number, b: number, relTol: number): boolean =>
  a === b ||
  a === Infinity ||
  b === -Infinity ||
  a >= b - relTol * Math.max(Math.abs(a), Math.abs(b));
