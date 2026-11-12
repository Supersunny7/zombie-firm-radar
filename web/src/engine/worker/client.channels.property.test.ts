import fc from 'fast-check';
import { describe, it } from 'vitest';

import { arbWorkerOps } from '../test/engineArbitraries';
import type { WorkerOp } from '../test/engineArbitraries';
import { createClientRun } from '../test/fakeWorker';
import type { ClientRun } from '../test/fakeWorker';

// Feature: rescue-engine, Property 28: Channels are independent
// **Validates: Requirements 12.15**

/** What one Channel shows for a run: settlement and posted flag per request, tags made channel-local. */
function view(run: ClientRun, channel: string): unknown[] {
  const mine = run.requests.filter((r) => r.channel === channel);
  const local = new Map(mine.map((r, i) => [r.index, i]));
  const loc = (t: number | undefined): number | undefined =>
    t === undefined ? undefined : local.get(t);
  return mine.map((r) => {
    const s = r.settlement;
    const settlement =
      s.status === 'resolved'
        ? { status: s.status, tag: loc(s.tag) }
        : s.status === 'rejected'
          ? { status: s.status, code: s.code, tag: loc(s.tag) }
          : { status: s.status };
    return { settlement, settleCount: r.settleCount, posted: r.posted };
  });
}

async function runAlone(ops: readonly WorkerOp[]): Promise<ClientRun> {
  const run = createClientRun();
  for (const op of ops) await run.step(op);
  return run;
}

/**
 * Abort ops index the signals of the whole run (`signalled[index % signalled.length]`).
 * In the interleaved run each sequence's abort index is remapped so it points at the signal that
 * the sequence would have hit when run alone: its own k-th signalled request, whose position in
 * the global signalled list is recorded in `own[k]`. An abort with no own signal is a no-op when
 * run alone, so it is dropped from the interleaved run (it would otherwise hit the other Channel).
 */
function interleave(
  a: readonly WorkerOp[],
  b: readonly WorkerOp[],
  schedule: readonly boolean[],
): WorkerOp[] {
  const seqs = [a, b];
  const pos = [0, 0];
  const own: number[][] = [[], []];
  let globalSignals = 0;
  const out: WorkerOp[] = [];
  const take = (s: 0 | 1): void => {
    const op = seqs[s]?.[pos[s] as number] as WorkerOp;
    pos[s] = (pos[s] as number) + 1;
    const mine = own[s] as number[];
    if (op.kind === 'request' || op.kind === 'requestAfterDispose') {
      if (op.signal) {
        mine.push(globalSignals);
        globalSignals += 1;
      }
      out.push(op);
    } else if (op.kind === 'abort') {
      if (mine.length === 0) return;
      out.push({ kind: 'abort', index: mine[op.index % mine.length] as number });
    } else {
      out.push(op);
    }
  };
  for (const pickA of schedule) {
    const aLeft = (pos[0] as number) < a.length;
    const bLeft = (pos[1] as number) < b.length;
    if (!aLeft && !bLeft) break;
    take(pickA ? (aLeft ? 0 : 1) : bLeft ? 1 : 0);
  }
  while ((pos[0] as number) < a.length) take(0);
  while ((pos[1] as number) < b.length) take(1);
  return out;
}

describe('Property 28: Channels are independent', () => {
  it('each Channel settles and posts as when its sequence runs alone on a fresh client', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbWorkerOps({ channels: ['a'], allowDispose: false }),
        arbWorkerOps({ channels: ['b'], allowDispose: false }),
        fc.array(fc.boolean(), { minLength: 60, maxLength: 60 }),
        async (opsA, opsB, schedule) => {
          const aloneA = await runAlone(opsA);
          const aloneB = await runAlone(opsB);

          const both = createClientRun();
          for (const op of interleave(opsA, opsB, schedule)) await both.step(op);

          return (
            JSON.stringify(view(both, 'a')) === JSON.stringify(view(aloneA, 'a')) &&
            JSON.stringify(view(both, 'b')) === JSON.stringify(view(aloneB, 'b'))
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
