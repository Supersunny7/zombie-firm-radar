import type { Firm, Macro } from '../../types/data';
import type { EngineError } from '../errors';
import type { SimulateOptions, SimulationResult, Treatment } from '../types';

export interface SimulateArgs {
  readonly firm: Firm;
  readonly treatment: Treatment;
  readonly delta: number;
  readonly macro: Macro;
  readonly options: SimulateOptions;
}

export type WorkerRequest = {
  readonly id: number;
  readonly kind: 'simulate';
  readonly args: SimulateArgs;
};

export type WorkerResponse =
  | { readonly id: number; readonly ok: true; readonly result: SimulationResult }
  | { readonly id: number; readonly ok: false; readonly error: EngineError };
