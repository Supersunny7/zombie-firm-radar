import type { EngineError, EngineErrorCode } from '../errors';
import { simulate } from '../simulate';
import type { SimulationResult } from '../types';
import type { SimulationClient, WorkerLike } from '../worker/client';
import { createSimulationClient } from '../worker/client';
import type { SimulateArgs, WorkerRequest, WorkerResponse } from '../worker/protocol';
import type { WorkerOp } from './engineArbitraries';

/** Test-only: an in-process `WorkerLike` plus a driver that applies `WorkerOp`s to a real client. */

export interface FakeWorkerOptions {
  /** Pass every posted request and every response through `structuredClone`, like a real Worker. */
  readonly structuredClone?: boolean;
  /** Answer each posted request with a real `simulate` call, delivered on a microtask. */
  readonly autoSimulate?: boolean;
}

export class FakeWorker implements WorkerLike {
  onmessage: ((ev: { data: WorkerResponse }) => void) | null = null;
  onerror: ((ev: never) => void) | null = null;
  /** Every message posted, in order. */
  readonly posted: WorkerRequest[] = [];
  terminateCalls = 0;
  private readonly answered = new Set<number>();
  private readonly options: FakeWorkerOptions;

  constructor(options: FakeWorkerOptions = {}) {
    this.options = options;
  }

  postMessage(msg: WorkerRequest): void {
    const stored = this.options.structuredClone ? structuredClone(msg) : msg;
    this.posted.push(stored);
    if (this.options.autoSimulate) {
      queueMicrotask(() => this.answerWithSimulate(stored.id));
    }
  }

  terminate(): void {
    this.terminateCalls += 1;
  }

  /** Posted requests that no `respond*` call has answered yet, oldest first. */
  unanswered(): WorkerRequest[] {
    return this.posted.filter((m) => !this.answered.has(m.id));
  }

  respondOk(id: number, result: SimulationResult): void {
    this.deliver({ id, ok: true, result });
  }

  respondError(id: number, error: EngineError): void {
    this.deliver({ id, ok: false, error });
  }

  /** A response with an id the client never issued. */
  respondUnknownId(result: SimulationResult, id = 1_000_000_000): void {
    this.deliver({ id, ok: true, result });
  }

  /** Runs the real `simulate` on the posted args and answers with its outcome. */
  answerWithSimulate(id: number): void {
    const msg = this.posted.find((m) => m.id === id);
    if (!msg) return;
    const { firm, treatment, delta, macro, options } = msg.args;
    const r = simulate(firm, treatment, delta, macro, options);
    this.deliver(r.ok ? { id, ok: true, result: r.value } : { id, ok: false, error: r.error });
  }

  /** Fires the worker error event. */
  fireError(): void {
    this.onerror?.({} as never);
  }

  private deliver(response: WorkerResponse): void {
    if (this.posted.some((m) => m.id === response.id)) this.answered.add(response.id);
    const data = this.options.structuredClone ? structuredClone(response) : response;
    // After dispose the client clears the handler, so a late response goes nowhere.
    this.onmessage?.({ data });
  }
}

export interface FakeWorkerFactory {
  readonly createWorker: () => WorkerLike;
  readonly workers: FakeWorker[];
  /** Number of times the client asked for a worker. */
  readonly factoryCalls: () => number;
}

export function createFakeWorkerFactory(options: FakeWorkerOptions = {}): FakeWorkerFactory {
  const workers: FakeWorker[] = [];
  return {
    createWorker: () => {
      const w = new FakeWorker(options);
      workers.push(w);
      return w;
    },
    workers,
    factoryCalls: () => workers.length,
  };
}

// --- Driver: applies WorkerOps to a real client and records what happened ---

export type Settlement =
  | { readonly status: 'pending' }
  | { readonly status: 'resolved'; readonly tag: number }
  | { readonly status: 'rejected'; readonly code: EngineErrorCode; readonly tag?: number };

/** Args that carry the request index so posted messages can be traced back. */
export function tagArgs(tag: number): SimulateArgs {
  return { tag } as unknown as SimulateArgs;
}

export function tagOf(msg: WorkerRequest): number {
  return (msg.args as unknown as { tag: number }).tag;
}

/** An ok result that carries its request tag. */
export function tagResult(tag: number): SimulationResult {
  return { tag } as unknown as SimulationResult;
}

/** An error response that carries its request tag in `detail.value`. */
export function tagError(tag: number): EngineError {
  return { code: 'invalid_paths', message: `tagged ${tag}`, detail: { value: tag } };
}

export interface RequestRecord {
  readonly index: number;
  readonly channel: string;
  readonly hasSignal: boolean;
  settlement: Settlement;
  /** How many times the promise reported a settlement (must end at 0 or 1). */
  settleCount: number;
  /** Whether the fake worker ever received this request. */
  posted: boolean;
}

export interface ClientRun {
  readonly client: SimulationClient;
  readonly fake: FakeWorkerFactory;
  readonly requests: RequestRecord[];
  /** Apply one operation, then let promise callbacks run. */
  step(op: WorkerOp): Promise<void>;
  /** Request indices in the order the fake worker received them. */
  postedOrder(): number[];
  /** Request indices the worker received and has not been answered, oldest first. */
  unansweredIndices(): number[];
  terminateCalls(): number;
  factoryCalls(): number;
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
};

export function createClientRun(options: FakeWorkerOptions = {}): ClientRun {
  const fake = createFakeWorkerFactory(options);
  const client = createSimulationClient({ createWorker: fake.createWorker });
  const requests: RequestRecord[] = [];
  const controllers = new Map<number, AbortController>();
  const signalled: number[] = [];
  let disposed = false;

  const postedMessages = (): WorkerRequest[] => fake.workers.flatMap((w) => w.posted);
  const syncPosted = (): void => {
    const seen = new Set(postedMessages().map(tagOf));
    for (const r of requests) r.posted = seen.has(r.index);
  };

  const issue = (channel: string, withSignal: boolean): void => {
    const index = requests.length;
    const record: RequestRecord = {
      index,
      channel,
      hasSignal: withSignal,
      settlement: { status: 'pending' },
      settleCount: 0,
      posted: false,
    };
    requests.push(record);
    let signal: AbortSignal | undefined;
    if (withSignal) {
      const controller = new AbortController();
      controllers.set(index, controller);
      signalled.push(index);
      signal = controller.signal;
    }
    client.simulate(tagArgs(index), { channel, signal }).then(
      (value) => {
        record.settleCount += 1;
        record.settlement = { status: 'resolved', tag: (value as unknown as { tag: number }).tag };
      },
      (e: EngineError) => {
        record.settleCount += 1;
        const carried = e.code === 'invalid_paths' ? (e.detail?.value as number) : undefined;
        record.settlement =
          carried === undefined
            ? { status: 'rejected', code: e.code }
            : { status: 'rejected', code: e.code, tag: carried };
      },
    );
  };

  const unansweredIndices = (): number[] => {
    const open = new Set<number>();
    for (const w of fake.workers) for (const m of w.unanswered()) open.add(tagOf(m));
    return postedMessages()
      .map(tagOf)
      .filter((t) => open.has(t));
  };

  return {
    client,
    fake,
    requests,
    async step(op) {
      switch (op.kind) {
        case 'request':
        case 'requestAfterDispose':
          issue(op.channel, op.signal);
          break;
        case 'respond': {
          if (disposed) break;
          const target = unansweredIndices().find((t) => requests[t]?.channel === op.channel);
          if (target === undefined) break;
          const worker = fake.workers[fake.workers.length - 1];
          const msg = postedMessages().find((m) => tagOf(m) === target);
          if (!worker || !msg) break;
          if (op.outcome === 'ok') worker.respondOk(msg.id, tagResult(target));
          else worker.respondError(msg.id, tagError(target));
          break;
        }
        case 'abort': {
          if (signalled.length === 0) break;
          const target = signalled[op.index % signalled.length];
          if (target !== undefined) controllers.get(target)?.abort();
          break;
        }
        case 'dispose':
          disposed = true;
          client.dispose();
          break;
      }
      await flush();
      syncPosted();
    },
    postedOrder: () => postedMessages().map(tagOf),
    unansweredIndices,
    terminateCalls: () => fake.workers.reduce((n, w) => n + w.terminateCalls, 0),
    factoryCalls: () => fake.factoryCalls(),
  };
}
