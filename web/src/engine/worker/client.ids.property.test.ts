import fc from 'fast-check';
import { describe, it } from 'vitest';

import type { EngineError } from '../errors';
import { createFakeWorkerFactory, tagArgs, tagError, tagOf, tagResult } from '../test/fakeWorker';
import { createSimulationClient } from './client';

// Feature: rescue-engine, Property 25: Worker responses are matched by id
// **Validates: Requirements 12.4, 12.5, 12.6**

type Kind = 'ok' | 'error';

type Event =
  | { readonly type: 'real'; readonly tag: number }
  | { readonly type: 'unknown'; readonly id: number };

interface Observed {
  count: number;
  status: 'pending' | 'resolved' | 'rejected';
  resolvedTag?: number;
  error?: EngineError;
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};

const arbScenario = fc.integer({ min: 1, max: 8 }).chain((n) =>
  fc.record({
    n: fc.constant(n),
    kinds: fc.array(fc.constantFrom<Kind>('ok', 'error'), { minLength: n, maxLength: n }),
    order: fc.shuffledSubarray(
      Array.from({ length: n }, (_, i) => i),
      { minLength: n, maxLength: n },
    ),
    unknowns: fc.array(
      fc.record({ pos: fc.nat({ max: n }), id: fc.integer({ min: 1000, max: 1_000_000 }) }),
      { maxLength: 6 },
    ),
  }),
);

describe('Property 25: Worker responses are matched by id', () => {
  it('settles each promise exactly once with its own response; unknown ids change nothing', async () => {
    await fc.assert(
      fc.asyncProperty(arbScenario, async ({ n, kinds, order, unknowns }) => {
        const fake = createFakeWorkerFactory();
        const client = createSimulationClient({ createWorker: fake.createWorker });
        const observed: Observed[] = [];

        // Distinct channels: every request is posted at once, no latest-wins.
        for (let i = 0; i < n; i += 1) {
          const o: Observed = { count: 0, status: 'pending' };
          observed.push(o);
          client.simulate(tagArgs(i), { channel: `ch${i}` }).then(
            (v) => {
              o.count += 1;
              o.status = 'resolved';
              o.resolvedTag = (v as unknown as { tag: number }).tag;
            },
            (e: EngineError) => {
              o.count += 1;
              o.status = 'rejected';
              o.error = e;
            },
          );
        }
        await flush();

        const worker = fake.workers[0];
        if (!worker || worker.posted.length !== n) return false;
        const idOf = new Map<number, number>();
        for (const m of worker.posted) idOf.set(tagOf(m), m.id);
        const issued = new Set(idOf.values());

        // Build the event sequence, inserting unknown ids anywhere.
        const events: Event[] = order.map((tag) => ({ type: 'real', tag }));
        for (const u of unknowns) {
          if (issued.has(u.id)) continue;
          events.splice(Math.min(u.pos, events.length), 0, { type: 'unknown', id: u.id });
        }

        const settled = new Set<number>();
        for (const ev of events) {
          const before = observed.map((o) => o.status);
          if (ev.type === 'unknown') {
            worker.respondUnknownId(tagResult(-1), ev.id);
          } else {
            const id = idOf.get(ev.tag) as number;
            if (kinds[ev.tag] === 'ok') worker.respondOk(id, tagResult(ev.tag));
            else worker.respondError(id, tagError(ev.tag));
            settled.add(ev.tag);
          }
          await flush();

          // Only the addressed request may change; unknown ids change nothing.
          for (let i = 0; i < n; i += 1) {
            const changed = observed[i]?.status !== before[i];
            const expected = ev.type === 'real' && ev.tag === i;
            if (changed !== expected) return false;
          }
        }

        for (let i = 0; i < n; i += 1) {
          const o = observed[i] as Observed;
          if (o.count !== 1) return false;
          if (kinds[i] === 'ok') {
            if (o.status !== 'resolved' || o.resolvedTag !== i) return false;
          } else {
            if (o.status !== 'rejected') return false;
            if (o.error?.code !== 'invalid_paths') return false;
            if ((o.error.detail as { value?: number } | undefined)?.value !== i) return false;
          }
        }
        return settled.size === n;
      }),
      { numRuns: 200 },
    );
  });
});
