import { describe, expect, it } from 'vitest';
import { drawBlock, mulberry32 } from './rng';

const MASK = 0xffffffffn;

/** Independent mulberry32 (bryc reference) in uint32 arithmetic via BigInt. */
function mulberry32Big(seed: number): () => number {
  let a = BigInt(seed) & MASK;
  return () => {
    a = (a + 0x6d2b79f5n) & MASK;
    let t = a;
    t = ((t ^ (t >> 15n)) * (t | 1n)) & MASK;
    t = (t ^ ((t + (((t ^ (t >> 7n)) * (t | 61n)) & MASK)) & MASK)) & MASK;
    return Number((t ^ (t >> 14n)) & MASK) / 4294967296;
  };
}

// Produced once by running mulberry32(42) in the implementation.
const PINNED_SEED_42 = [
  0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693,
  0.17481389874592423,
];

describe('mulberry32', () => {
  it('matches the pinned seed-42 vectors and the BigInt reference', () => {
    const impl = mulberry32(42);
    const ref = mulberry32Big(42);
    const got = PINNED_SEED_42.map(() => impl());
    const refVals = PINNED_SEED_42.map(() => ref());
    expect(got[0]).toBe(0.6011037519201636);
    expect(got[1]).toBe(0.44829055899754167);
    expect(got[2]).toBe(0.8524657934904099);
    expect(got[3]).toBe(0.6697340414393693);
    expect(got[4]).toBe(0.17481389874592423);
    expect(refVals).toEqual(PINNED_SEED_42);
  });

  it('returns identical values for a repeated call with the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = [a(), a(), a(), a(), a()];
    const second = [b(), b(), b(), b(), b()];
    expect(second).toEqual(first);
  });
});

describe('drawBlock', () => {
  it('calls next exactly 6 times', () => {
    let calls = 0;
    drawBlock(() => {
      calls++;
      return 0.5;
    });
    expect(calls).toBe(6);
  });

  it('keeps recovery in [0.6, 0.8) and haircut in [0.30, 0.60)', () => {
    const lo = drawBlock(() => 0);
    expect(lo.recovery).toBe(0.6);
    expect(lo.haircut).toBe(0.3);
    const hi = drawBlock(() => 1 - 2 ** -32);
    expect(hi.recovery).toBeLessThan(0.8);
    expect(hi.recovery).toBeGreaterThanOrEqual(0.6);
    expect(hi.haircut).toBeLessThan(0.6);
    expect(hi.haircut).toBeGreaterThanOrEqual(0.3);
  });

  it('gives finite eps for a generator returning 1 - 2^-32', () => {
    const block = drawBlock(() => 1 - 2 ** -32);
    for (const e of block.eps) {
      expect(Number.isFinite(e)).toBe(true);
    }
  });
});
