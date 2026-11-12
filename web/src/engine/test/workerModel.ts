import type { Settlement } from './fakeWorker';
import type { WorkerOp } from './engineArbitraries';

/**
 * Reference model of the latest-wins rules (Req 12.7, 12.8, 12.11 to 12.15), written from the
 * design text alone. It does not use the client's code. Request `i` is the i-th request issued
 * (its tag), whether or not it was ever posted.
 *
 * Abort target rule shared with the driver: `abort(i)` aborts the request with signal number
 * `i % n`, where signals are numbered in creation order and n is the count so far; no-op if n = 0.
 */

interface Slot {
  inFlight: number | undefined;
  queued: number | undefined;
}

export class WorkerModel {
  readonly settlements: Settlement[] = [];
  readonly posted: boolean[] = [];
  /** Request indices in the order the worker received them. */
  readonly postedOrder: number[] = [];
  terminateCalls = 0;
  factoryCalls = 0;

  private readonly channelOf: string[] = [];
  private readonly signalled: number[] = [];
  private readonly answered = new Set<number>();
  private readonly slots = new Map<string, Slot>();
  private disposed = false;

  request(channel: string, withSignal: boolean): void {
    const i = this.settlements.length;
    this.settlements.push({ status: 'pending' });
    this.posted.push(false);
    this.channelOf.push(channel);
    if (withSignal) this.signalled.push(i);
    if (this.disposed) {
      this.reject(i, 'worker_disposed');
      return;
    }
    const slot = this.slot(channel);
    if (slot.inFlight === undefined) {
      this.post(slot, i);
      return;
    }
    const replaced = slot.queued;
    slot.queued = i;
    if (replaced !== undefined) this.reject(replaced, 'superseded');
  }

  respond(channel: string, outcome: 'ok' | 'error'): void {
    if (this.disposed) return;
    const target = this.postedOrder.find(
      (i) => !this.answered.has(i) && this.channelOf[i] === channel,
    );
    if (target === undefined) return;
    this.answered.add(target);
    const slot = this.slot(channel);
    slot.inFlight = undefined;
    if (slot.queued !== undefined) {
      this.reject(target, 'superseded');
    } else if (outcome === 'ok') {
      this.settle(target, { status: 'resolved', tag: target });
    } else {
      this.settle(target, { status: 'rejected', code: 'invalid_paths', tag: target });
    }
    this.promote(slot);
  }

  abort(n: number): void {
    if (this.signalled.length === 0) return;
    const i = this.signalled[n % this.signalled.length];
    if (i === undefined || this.isSettled(i)) return;
    const slot = this.slot(this.channelOf[i] as string);
    this.reject(i, 'aborted');
    if (slot.queued === i) {
      slot.queued = undefined;
    }
    // An aborted in-flight request stays in flight until its response arrives.
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.factoryCalls > 0) this.terminateCalls += 1;
    for (let i = 0; i < this.settlements.length; i += 1) {
      if (!this.isSettled(i)) this.reject(i, 'worker_disposed');
    }
    this.slots.clear();
  }

  apply(op: WorkerOp): void {
    switch (op.kind) {
      case 'request':
      case 'requestAfterDispose':
        this.request(op.channel, op.signal);
        break;
      case 'respond':
        this.respond(op.channel, op.outcome);
        break;
      case 'abort':
        this.abort(op.index);
        break;
      case 'dispose':
        this.dispose();
        break;
    }
  }

  /** Requests currently held as in flight, per channel (an aborted one still counts). */
  inFlightOf(channel: string): number | undefined {
    return this.slots.get(channel)?.inFlight;
  }

  queuedOf(channel: string): number | undefined {
    return this.slots.get(channel)?.queued;
  }

  private slot(channel: string): Slot {
    let s = this.slots.get(channel);
    if (!s) {
      s = { inFlight: undefined, queued: undefined };
      this.slots.set(channel, s);
    }
    return s;
  }

  private post(slot: Slot, i: number): void {
    slot.inFlight = i;
    if (this.factoryCalls === 0) this.factoryCalls = 1;
    this.posted[i] = true;
    this.postedOrder.push(i);
  }

  private promote(slot: Slot): void {
    if (slot.inFlight === undefined && slot.queued !== undefined) {
      const next = slot.queued;
      slot.queued = undefined;
      this.post(slot, next);
    }
  }

  private isSettled(i: number): boolean {
    return this.settlements[i]?.status !== 'pending';
  }

  private settle(i: number, s: Settlement): void {
    if (this.isSettled(i)) return;
    this.settlements[i] = s;
  }

  private reject(i: number, code: 'superseded' | 'aborted' | 'worker_disposed'): void {
    this.settle(i, { status: 'rejected', code });
  }
}

/** Runs a whole sequence through a fresh model. */
export function runModel(ops: readonly WorkerOp[]): WorkerModel {
  const m = new WorkerModel();
  for (const op of ops) m.apply(op);
  return m;
}
