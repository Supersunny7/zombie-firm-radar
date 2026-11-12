/**
 * PRNG and the fixed random block per path (Req 8.3, 8.4).
 * Pure: the generator state lives in a closure, no module-level mutable state.
 */

/** Random numbers for one Path, always 6 uniforms in the same order. */
export interface RandomBlock {
  readonly recovery: number; // [0.6, 0.8)
  readonly haircut: number; // [0.30, 0.60), reserved for chapter_11; unused in v1
  readonly eps: readonly [number, number, number];
}

/** mulberry32 (bryc reference port). Returns uniforms in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws exactly 6 uniforms: recovery, haircut, then Box-Muller from u2..u5. */
export function drawBlock(next: () => number): RandomBlock {
  const u0 = next();
  const u1 = next();
  const u2 = next();
  const u3 = next();
  const u4 = next();
  const u5 = next();
  const rA = Math.sqrt(-2 * Math.log(1 - u2)); // 1 - u in (0, 1]
  const rB = Math.sqrt(-2 * Math.log(1 - u4));
  return {
    recovery: 0.6 + 0.2 * u0,
    haircut: 0.3 + 0.3 * u1,
    eps: [
      rA * Math.cos(2 * Math.PI * u3),
      rA * Math.sin(2 * Math.PI * u3),
      rB * Math.cos(2 * Math.PI * u5),
    ],
  };
}

/**
 * n successive blocks from one stream; block k uses uniforms 6k..6k+5.
 * `makeGenerator` is a test-only seam (for counting uniforms).
 */
export function blocksFor(
  seed: number,
  n: number,
  makeGenerator: (seed: number) => () => number = mulberry32,
): RandomBlock[] {
  const next = makeGenerator(seed);
  const blocks: RandomBlock[] = [];
  for (let k = 0; k < n; k++) {
    blocks.push(drawBlock(next));
  }
  return blocks;
}
