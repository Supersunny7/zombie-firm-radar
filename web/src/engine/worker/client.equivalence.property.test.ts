import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { simulate } from '../simulate';
import {
  arbBadSeed,
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from '../test/engineArbitraries';
import { createFakeWorkerFactory } from '../test/fakeWorker';
import { createSimulationClient } from './client';

// Feature: rescue-engine, Property 26: The worker gives the same result as a direct call
// **Validates: Requirements 12.10**

const makeClient = () => {
  const fake = createFakeWorkerFactory({ structuredClone: true, autoSimulate: true });
  return createSimulationClient({ createWorker: fake.createWorker });
};

describe('Property 26: worker equivalence', () => {
  it('resolves with a result deeply equal to a direct simulate call', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        fc.integer({ min: 1, max: 200 }),
        arbSeed,
        async (firm, treatment, delta, macro, paths, seed) => {
          const options = { paths, seed };
          const direct = simulate(firm, treatment, delta, macro, options);
          expect(direct.ok).toBe(true);
          const client = makeClient();
          try {
            const viaWorker = await client.simulate({ firm, treatment, delta, macro, options });
            if (direct.ok) expect(viaWorker).toEqual(direct.value);
          } finally {
            client.dispose();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects with an EngineError deeply equal to the direct simulate error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidFirm,
        arbTreatment,
        arbDelta,
        arbMacroValid,
        fc.integer({ min: 1, max: 200 }),
        arbBadSeed,
        async (firm, treatment, delta, macro, paths, bad) => {
          const options = { paths, seed: bad.seed as number };
          const direct = simulate(firm, treatment, delta, macro, options);
          expect(direct.ok).toBe(false);
          const client = makeClient();
          try {
            const outcome = await client.simulate({ firm, treatment, delta, macro, options }).then(
              () => ({ rejected: false as const, error: undefined }),
              (error: unknown) => ({ rejected: true as const, error }),
            );
            expect(outcome.rejected).toBe(true);
            if (!direct.ok) expect(outcome.error).toEqual(direct.error);
          } finally {
            client.dispose();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
