import type { EngineError } from '../errors';
import { aborted, superseded, workerDisposed } from '../errors';
import type { SimulationResult } from '../types';
import type { SimulateArgs, WorkerRequest, WorkerResponse } from './protocol';

/** The slice of `Worker` the client needs. A real Worker (via the default factory) or a fake satisfies it. */
export interface WorkerLike {
  postMessage(msg: WorkerRequest): void;
  terminate(): void;
  onmessage: ((ev: { data: WorkerResponse }) => void) | null;
  /** Any worker error event makes the client behave like `dispose()`. */
  onerror: ((ev: never) => void) | null;
}

export interface SimulationClient {
  simulate(
    args: SimulateArgs,
    opts?: { channel?: string; signal?: AbortSignal },
  ): Promise<SimulationResult>;
  dispose(): void;
}

interface Pending {
  readonly id: number;
  readonly args: SimulateArgs;
  readonly resolve: (result: SimulationResult) => void;
  readonly reject: (error: EngineError) => void;
  readonly signal: AbortSignal | undefined;
  onAbort: (() => void) | undefined;
  settled: boolean;
}

interface ChannelState {
  inFlight?: Pending;
  queued?: Pending;
}

const DEFAULT_CHANNEL = 'default';

export function createSimulationClient(deps?: {
  createWorker?: () => WorkerLike;
}): SimulationClient {
  const createWorker: () => WorkerLike =
    deps?.createWorker ??
    (() =>
      new Worker(new URL('./simulate.worker.ts', import.meta.url), {
        type: 'module',
      }) as unknown as WorkerLike);

  const channels = new Map<string, ChannelState>();
  let worker: WorkerLike | undefined;
  let disposed = false;
  let nextId = 1;

  // First of response, superseded, aborted or worker_disposed wins.
  const settle = (p: Pending, action: () => void): void => {
    if (p.settled) return;
    p.settled = true;
    if (p.signal && p.onAbort) p.signal.removeEventListener('abort', p.onAbort);
    action();
  };

  const ensureWorker = (): WorkerLike => {
    if (worker) return worker;
    const w = createWorker();
    w.onmessage = handleMessage;
    w.onerror = () => dispose();
    worker = w;
    return w;
  };

  const post = (channel: string, state: ChannelState, p: Pending): void => {
    state.inFlight = p;
    try {
      ensureWorker().postMessage({ id: p.id, kind: 'simulate', args: p.args });
    } catch (e) {
      state.inFlight = undefined;
      settle(p, () => p.reject(e as EngineError));
      pump(channel, state);
    }
  };

  // Posts the queued request if the channel is free; drops empty channel entries.
  const pump = (channel: string, state: ChannelState): void => {
    if (!state.inFlight && state.queued) {
      const next = state.queued;
      state.queued = undefined;
      post(channel, state, next);
    }
    if (!state.inFlight && !state.queued && channels.get(channel) === state) {
      channels.delete(channel);
    }
  };

  function handleMessage(ev: { data: WorkerResponse }): void {
    const msg = ev.data;
    for (const [channel, state] of channels) {
      const p = state.inFlight;
      if (!p || p.id !== msg.id) continue;
      state.inFlight = undefined;
      if (state.queued) {
        // Stale result: a newer request is waiting.
        settle(p, () => p.reject(superseded()));
      } else if (msg.ok) {
        settle(p, () => p.resolve(msg.result));
      } else {
        settle(p, () => p.reject(msg.error));
      }
      pump(channel, state);
      return;
    }
    // Unknown id: ignored.
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      worker = undefined;
    }
    const all: Pending[] = [];
    for (const state of channels.values()) {
      if (state.inFlight) all.push(state.inFlight);
      if (state.queued) all.push(state.queued);
    }
    channels.clear();
    for (const p of all) settle(p, () => p.reject(workerDisposed()));
  }

  const abortPending = (channel: string, p: Pending): void => {
    if (p.settled) return;
    const state = channels.get(channel);
    if (state && state.queued === p) {
      state.queued = undefined;
      settle(p, () => p.reject(aborted()));
      pump(channel, state);
      return;
    }
    // In flight: reject now; the later response only frees the channel.
    settle(p, () => p.reject(aborted()));
  };

  const simulate: SimulationClient['simulate'] = (args, opts) =>
    new Promise<SimulationResult>((resolve, reject) => {
      if (disposed) {
        reject(workerDisposed());
        return;
      }
      const signal = opts?.signal;
      if (signal?.aborted) {
        reject(aborted());
        return;
      }
      const channel = opts?.channel ?? DEFAULT_CHANNEL;
      const p: Pending = {
        id: nextId++,
        args,
        resolve,
        reject,
        signal,
        onAbort: undefined,
        settled: false,
      };
      if (signal) {
        p.onAbort = () => abortPending(channel, p);
        signal.addEventListener('abort', p.onAbort, { once: true });
      }

      let state = channels.get(channel);
      if (!state) {
        state = {};
        channels.set(channel, state);
      }
      if (!state.inFlight) {
        post(channel, state, p);
        return;
      }
      const replaced = state.queued;
      state.queued = p;
      if (replaced) settle(replaced, () => replaced.reject(superseded()));
    });

  return { simulate, dispose };
}
