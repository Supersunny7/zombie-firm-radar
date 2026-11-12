import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbWorkerOps } from '../test/engineArbitraries';
import { createClientRun } from '../test/fakeWorker';
import { WorkerModel } from '../test/workerModel';

// Feature: rescue-engine, Property 27: Latest-wins per Channel matches a reference model
// **Validates: Requirements 12.1, 12.7, 12.8, 12.11, 12.12, 12.13, 12.14**

const CHANNEL_SETS: readonly (readonly string[])[] = [['default'], ['default', 'a']];

describe('Property 27: Latest-wins per Channel matches a reference model', () => {
  for (const channels of CHANNEL_SETS) {
    it(`client equals the model after every step (channels: ${channels.join(', ')})`, async () => {
      await fc.assert(
        fc.asyncProperty(arbWorkerOps({ channels, allowDispose: true }), async (ops) => {
          const run = createClientRun();
          const model = new WorkerModel();

          let disposed = false;
          for (const op of ops) {
            if (op.kind === 'dispose') disposed = true;
            await run.step(op);
            model.apply(op);

            // 6. settle-once and equal settlement
            expect(run.requests.length).toBe(model.settlements.length);
            for (const rec of run.requests) {
              const expected = model.settlements[rec.index];
              expect(rec.settlement, `request ${rec.index} settlement`).toEqual(expected);
              expect(rec.settleCount).toBe(expected?.status === 'pending' ? 0 : 1);
              // 4. an aborted/superseded queued request is never posted: posted flags match
              expect(rec.posted, `request ${rec.index} posted`).toBe(model.posted[rec.index]);
            }

            // 1. what the worker received, in order, and at most one unanswered per channel
            expect(run.postedOrder()).toEqual(model.postedOrder);
            const perChannel = new Map<string, number>();
            for (const i of run.unansweredIndices()) {
              const ch = run.requests[i]?.channel as string;
              perChannel.set(ch, (perChannel.get(ch) ?? 0) + 1);
            }
            for (const ch of channels) {
              expect(perChannel.get(ch) ?? 0).toBeLessThanOrEqual(1);
              const inFlight = model.inFlightOf(ch);
              const open = run.unansweredIndices().filter((i) => run.requests[i]?.channel === ch);
              // After dispose the worker is terminated: its unanswered requests are moot.
              if (!disposed) expect(open).toEqual(inFlight === undefined ? [] : [inFlight]);
              // a queued request is not yet posted
              const queued = model.queuedOf(ch);
              if (queued !== undefined) expect(run.requests[queued]?.posted).toBe(false);
            }

            // 5. dispose: one terminate, no factory calls after dispose
            expect(run.terminateCalls()).toBe(model.terminateCalls);
            expect(run.factoryCalls()).toBe(model.factoryCalls);
          }
        }),
        { numRuns: 200 },
      );
    });
  }
});
