import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { blocksFor, drawBlock, mulberry32 } from './rng';
import { simulateWith } from './simulate';
import {
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';

const arbCount = fc.integer({ min: 1, max: 50 });

// Feature: rescue-engine, Property 19: Fixed random block per path
// **Validates: Requirements 8.2, 8.4**
describe('Property 19: Fixed random block per path', () => {
  it('blocksFor(seed, n) is a prefix of blocksFor(seed, n + m)', () => {
    fc.assert(
      fc.property(arbSeed, arbCount, arbCount, (seed, n, m) => {
        expect(blocksFor(seed, n)).toEqual(blocksFor(seed, n + m).slice(0, n));
      }),
      { numRuns: 100 },
    );
  });

  it('drawBlock calls next exactly 6 times', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const inner = mulberry32(seed);
        let calls = 0;
        drawBlock(() => {
          calls++;
          return inner();
        });
        expect(calls).toBe(6);
      }),
      { numRuns: 100 },
    );
  });

  it('simulate with paths = n consumes exactly 6n uniforms', () => {
    fc.assert(
      fc.property(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        arbSeed,
        arbCount,
        (firm, treatment, delta, macro, seed, n) => {
          let calls = 0;
          const makeGenerator = (s: number): (() => number) => {
            const inner = mulberry32(s);
            return () => {
              calls++;
              return inner();
            };
          };
          const result = simulateWith(
            firm,
            treatment,
            delta,
            macro,
            { paths: n, seed },
            makeGenerator,
          );
          expect(result.ok).toBe(true);
          expect(calls).toBe(6 * n);
        },
      ),
      { numRuns: 100 },
    );
  });
});
