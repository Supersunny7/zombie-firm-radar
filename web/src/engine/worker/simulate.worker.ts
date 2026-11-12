import { simulate } from '../simulate';
import type { WorkerRequest, WorkerResponse } from './protocol';

// Minimal typing of the dedicated worker scope; the project lib is DOM, not WebWorker.
const scope = self as unknown as {
  onmessage: ((ev: { data: WorkerRequest }) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

scope.onmessage = (ev) => {
  const { id, args } = ev.data;
  const r = simulate(args.firm, args.treatment, args.delta, args.macro, args.options);
  scope.postMessage(r.ok ? { id, ok: true, result: r.value } : { id, ok: false, error: r.error });
};
