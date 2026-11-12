import { describe, expect, it } from 'vitest';
import type { EngineError } from '../errors';
import { createFakeWorkerFactory, tagArgs, tagError, tagOf, tagResult } from '../test/fakeWorker';
import type { SimulationResult } from '../types';
import { createSimulationClient } from './client';

type Outcome =
  | { status: 'pending' }
  | { status: 'resolved'; value: SimulationResult }
  | { status: 'rejected'; error: EngineError };

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
};

function setup() {
  const fake = createFakeWorkerFactory();
  const client = createSimulationClient({ createWorker: fake.createWorker });
  const start = (
    tag: number,
    opts?: { channel?: string; signal?: AbortSignal },
  ): { outcome: Outcome } => {
    const holder: { outcome: Outcome } = { outcome: { status: 'pending' } };
    client.simulate(tagArgs(tag), opts).then(
      (value) => {
        holder.outcome = { status: 'resolved', value };
      },
      (error: EngineError) => {
        holder.outcome = { status: 'rejected', error };
      },
    );
    return holder;
  };
  const worker = () => fake.workers[0]!;
  return { fake, client, start, worker };
}

describe('worker client: basics', () => {
  it('creating a client without a request constructs no worker', () => {
    const { fake } = setup();
    expect(fake.factoryCalls()).toBe(0);
  });

  it('posts a request and resolves the matching promise (12.2)', async () => {
    const { start, worker, fake } = setup();
    const a = start(1);
    expect(fake.factoryCalls()).toBe(1);
    expect(worker().posted).toHaveLength(1);
    expect(worker().posted[0]?.kind).toBe('simulate');
    expect(tagOf(worker().posted[0]!)).toBe(1);
    await flush();
    expect(a.outcome.status).toBe('pending');
    worker().respondOk(worker().posted[0]!.id, tagResult(1));
    await flush();
    expect(a.outcome).toEqual({ status: 'resolved', value: tagResult(1) });
  });

  it('an error response rejects only its own promise with the carried error (12.4)', async () => {
    const { start, worker } = setup();
    const a = start(1, { channel: 'a' });
    const b = start(2, { channel: 'b' });
    const [ma, mb] = worker().posted;
    worker().respondError(ma!.id, tagError(1));
    await flush();
    expect(a.outcome).toEqual({ status: 'rejected', error: tagError(1) });
    expect(b.outcome.status).toBe('pending');
    worker().respondOk(mb!.id, tagResult(2));
    await flush();
    expect(b.outcome).toEqual({ status: 'resolved', value: tagResult(2) });
  });

  it('ignores a response with an unknown id (12.6)', async () => {
    const { start, worker } = setup();
    const a = start(1);
    const b = start(2);
    worker().respondUnknownId(tagResult(99));
    await flush();
    expect(a.outcome.status).toBe('pending');
    expect(b.outcome.status).toBe('pending');
    expect(worker().posted).toHaveLength(1);
    worker().respondOk(worker().posted[0]!.id, tagResult(1));
    await flush();
    // a is stale because b is queued; the real flow still continues.
    expect(a.outcome.status).toBe('rejected');
    expect(worker().posted).toHaveLength(2);
  });
});

describe('worker client: superseded', () => {
  it('follows the design sequence: B and A superseded, C2 posted and resolved (12.12, 12.13)', async () => {
    const { start, worker } = setup();
    const a = start(1, { channel: 'odds' });
    expect(worker().posted.map((m) => m.id)).toEqual([1]);
    const b = start(2, { channel: 'odds' });
    expect(worker().posted).toHaveLength(1);
    const c2 = start(3, { channel: 'odds' });
    await flush();
    expect(b.outcome).toMatchObject({ status: 'rejected', error: { code: 'superseded' } });
    expect(a.outcome.status).toBe('pending');
    expect(c2.outcome.status).toBe('pending');
    expect(worker().posted).toHaveLength(1);

    worker().respondOk(1, tagResult(1));
    await flush();
    expect(a.outcome).toMatchObject({ status: 'rejected', error: { code: 'superseded' } });
    expect(worker().posted.map((m) => m.id)).toEqual([1, 3]);
    expect(tagOf(worker().posted[1]!)).toBe(3);

    worker().respondOk(3, tagResult(3));
    await flush();
    expect(c2.outcome).toEqual({ status: 'resolved', value: tagResult(3) });
  });
});

describe('worker client: aborted', () => {
  it('a queued request that is aborted is never posted (12.14)', async () => {
    const { start, worker } = setup();
    const ctrl = new AbortController();
    const a = start(1);
    const b = start(2, { signal: ctrl.signal });
    ctrl.abort();
    await flush();
    expect(b.outcome).toMatchObject({ status: 'rejected', error: { code: 'aborted' } });
    worker().respondOk(1, tagResult(1));
    await flush();
    expect(a.outcome).toEqual({ status: 'resolved', value: tagResult(1) });
    expect(worker().posted.map(tagOf)).toEqual([1]);
  });

  it('an in-flight abort rejects at once, ignores the later response, then posts the queued request (12.14)', async () => {
    const { start, worker } = setup();
    const ctrl = new AbortController();
    const a = start(1, { signal: ctrl.signal });
    const b = start(2);
    ctrl.abort();
    await flush();
    expect(a.outcome).toMatchObject({ status: 'rejected', error: { code: 'aborted' } });
    expect(b.outcome.status).toBe('pending');
    expect(worker().posted.map(tagOf)).toEqual([1]);

    worker().respondOk(1, tagResult(1));
    await flush();
    expect(a.outcome).toMatchObject({ status: 'rejected', error: { code: 'aborted' } });
    expect(worker().posted.map(tagOf)).toEqual([1, 2]);

    worker().respondOk(2, tagResult(2));
    await flush();
    expect(b.outcome).toEqual({ status: 'resolved', value: tagResult(2) });
  });

  it('an already-aborted signal rejects without posting (12.14)', async () => {
    const { start, fake } = setup();
    const ctrl = new AbortController();
    ctrl.abort();
    const a = start(1, { signal: ctrl.signal });
    await flush();
    expect(a.outcome).toMatchObject({ status: 'rejected', error: { code: 'aborted' } });
    expect(fake.factoryCalls()).toBe(0);
  });
});

describe('worker client: channels', () => {
  it('requests on "a" and "b" never supersede each other (12.15)', async () => {
    const { start, worker } = setup();
    const a1 = start(1, { channel: 'a' });
    const b1 = start(2, { channel: 'b' });
    const a2 = start(3, { channel: 'a' });
    const b2 = start(4, { channel: 'b' });
    await flush();
    expect(worker().posted.map(tagOf)).toEqual([1, 2]);
    expect(a1.outcome.status).toBe('pending');
    expect(b1.outcome.status).toBe('pending');
    expect(a2.outcome.status).toBe('pending');
    expect(b2.outcome.status).toBe('pending');

    worker().respondOk(2, tagResult(2));
    await flush();
    // b1 is stale because b2 is queued; channel a is untouched.
    expect(b1.outcome).toMatchObject({ status: 'rejected', error: { code: 'superseded' } });
    expect(a1.outcome.status).toBe('pending');
    expect(a2.outcome.status).toBe('pending');
    expect(worker().posted.map(tagOf)).toEqual([1, 2, 4]);
  });
});

describe('worker client: dispose', () => {
  it('rejects in-flight and queued requests on every channel and terminates once (12.7)', async () => {
    const { start, client, worker } = setup();
    const all = [
      start(1, { channel: 'a' }),
      start(2, { channel: 'a' }),
      start(3, { channel: 'b' }),
      start(4, { channel: 'b' }),
    ];
    const w = worker();
    client.dispose();
    client.dispose();
    await flush();
    for (const r of all) {
      expect(r.outcome).toMatchObject({ status: 'rejected', error: { code: 'worker_disposed' } });
    }
    expect(w.terminateCalls).toBe(1);
  });

  it('a later request rejects with worker_disposed and does not call the factory (12.8)', async () => {
    const { start, client, fake } = setup();
    client.dispose();
    const a = start(1);
    await flush();
    expect(a.outcome).toMatchObject({ status: 'rejected', error: { code: 'worker_disposed' } });
    expect(fake.factoryCalls()).toBe(0);
  });

  it('a worker error event behaves like dispose()', async () => {
    const { start, worker, fake } = setup();
    const a = start(1);
    const b = start(2);
    const w = worker();
    w.fireError();
    await flush();
    expect(a.outcome).toMatchObject({ status: 'rejected', error: { code: 'worker_disposed' } });
    expect(b.outcome).toMatchObject({ status: 'rejected', error: { code: 'worker_disposed' } });
    expect(w.terminateCalls).toBe(1);
    const c = start(3);
    await flush();
    expect(c.outcome).toMatchObject({ status: 'rejected', error: { code: 'worker_disposed' } });
    expect(fake.factoryCalls()).toBe(1);
  });
});
