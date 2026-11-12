import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import type { Firm, Macro } from '../types/data';
import {
  applyTreatment,
  createSimulationClient,
  drawOutcome,
  seedFrom,
  simulate,
  type EngineError,
  type EngineErrorCode,
  type EngineResult,
  type Treatment,
} from './index';
import { createFakeWorkerFactory } from './test/fakeWorker';

const firm = (): Firm => structuredClone(ashgroveWorks);
const macro = (): Macro => structuredClone(fixtureMacro);
const asTreatment = (x: unknown): Treatment => x as Treatment;
const OPTS = { paths: 10, seed: 1 };

function errorOf<T>(r: EngineResult<T>): EngineError {
  if (r.ok) throw new Error('expected an error result');
  return r.error;
}

const simArgs = () => ({
  firm: firm(),
  treatment: [] as Treatment,
  delta: 0,
  macro: macro(),
  options: OPTS,
});

async function rejection(p: Promise<unknown>): Promise<EngineError> {
  try {
    await p;
  } catch (e) {
    return e as EngineError;
  }
  throw new Error('expected rejection');
}

/** One trigger per code. The record type makes the compiler demand every EngineErrorCode. */
const triggers: Record<EngineErrorCode, () => EngineError | Promise<EngineError>> = {
  unknown_tool: () => errorOf(applyTreatment(firm(), asTreatment([{ name: 'bogus' }]), 0, macro())),
  too_many_tools: () =>
    errorOf(
      applyTreatment(
        firm(),
        asTreatment([
          { name: 'cut_costs', params: { c: 0.01 } },
          { name: 'sell_assets', params: { s: 0.1 } },
          { name: 'debt_for_equity', params: { w: 0.1 } },
          { name: 'refinance' },
        ]),
        0,
        macro(),
      ),
    ),
  duplicate_tool: () =>
    errorOf(
      applyTreatment(
        firm(),
        asTreatment([
          { name: 'cut_costs', params: { c: 0.01 } },
          { name: 'cut_costs', params: { c: 0.02 } },
        ]),
        0,
        macro(),
      ),
    ),
  param_out_of_range: () =>
    errorOf(
      applyTreatment(firm(), asTreatment([{ name: 'cut_costs', params: { c: 0.5 } }]), 0, macro()),
    ),
  delta_out_of_range: () => errorOf(applyTreatment(firm(), [], 0.06, macro())),
  not_rescuable: () => {
    const f = firm();
    const last = f.years[f.years.length - 1];
    if (!last) throw new Error('fixture has no years');
    last.total_debt_usd = null;
    return errorOf(applyTreatment(f, [], 0, macro()));
  },
  invalid_paths: () => errorOf(simulate(firm(), [], 0, macro(), { paths: 0, seed: 1 })),
  invalid_date: () => errorOf(seedFrom('0000000001', [], '2025-02-30')),
  worker_disposed: async () => {
    const fake = createFakeWorkerFactory();
    const client = createSimulationClient({ createWorker: fake.createWorker });
    const p = client.simulate(simArgs());
    client.dispose();
    return rejection(p);
  },
  superseded: async () => {
    const fake = createFakeWorkerFactory();
    const client = createSimulationClient({ createWorker: fake.createWorker });
    void client.simulate(simArgs()).catch(() => undefined);
    const queued = client.simulate(simArgs());
    const rejected = rejection(queued);
    void client.simulate(simArgs()).catch(() => undefined);
    return rejected;
  },
  aborted: async () => {
    const fake = createFakeWorkerFactory();
    const client = createSimulationClient({ createWorker: fake.createWorker });
    const controller = new AbortController();
    const p = client.simulate(simArgs(), { signal: controller.signal });
    controller.abort();
    return rejection(p);
  },
  invalid_treatment: () => errorOf(applyTreatment(firm(), asTreatment('nope'), 0, macro())),
  invalid_seed: () => errorOf(drawOutcome(firm(), [], 0, macro(), -1)),
  invalid_cik: () => errorOf(seedFrom('123', [], '2025-01-31')),
};

/** Pinned from a first run of the code. */
const expected: Record<EngineErrorCode, EngineError> = {
  unknown_tool: {
    code: 'unknown_tool',
    message:
      'Unknown tool "bogus". Available tools: cut_costs, sell_assets, debt_for_equity, refinance.',
    detail: { tool: 'bogus', index: 0 },
  },
  too_many_tools: {
    code: 'too_many_tools',
    message: 'A treatment can use at most 3 tools, got 4.',
    detail: { value: 4 },
  },
  duplicate_tool: {
    code: 'duplicate_tool',
    message: 'Each tool can be used only once, but "cut_costs" appears twice.',
    detail: { tool: 'cut_costs' },
  },
  param_out_of_range: {
    code: 'param_out_of_range',
    message: 'cut_costs needs c between 0 and 0.08.',
    detail: { tool: 'cut_costs', param: 'c', value: 0.5 },
  },
  delta_out_of_range: {
    code: 'delta_out_of_range',
    message: 'Rate shock must be between 0 and 0.05.',
    detail: { value: 0.06 },
  },
  not_rescuable: {
    code: 'not_rescuable',
    message: 'Not rescuable: missing total debt for FY2024.',
    detail: { inputs: ['D'] },
  },
  invalid_paths: {
    code: 'invalid_paths',
    message: 'Number of paths must be a whole number from 1 to 100000.',
    detail: { value: 0 },
  },
  invalid_date: {
    code: 'invalid_date',
    message: 'Date must be a valid calendar date written as YYYY-MM-DD.',
    detail: { value: '2025-02-30' },
  },
  worker_disposed: {
    code: 'worker_disposed',
    message: 'The simulation worker has been shut down.',
  },
  superseded: {
    code: 'superseded',
    message: 'A newer simulation request replaced this one.',
  },
  aborted: {
    code: 'aborted',
    message: 'The simulation request was cancelled.',
  },
  invalid_treatment: {
    code: 'invalid_treatment',
    message: 'Treatment must be a list of tools.',
    detail: { value: 'nope' },
  },
  invalid_seed: {
    code: 'invalid_seed',
    message: 'Seed must be a whole number from 0 to 4294967295.',
    detail: { value: -1 },
  },
  invalid_cik: {
    code: 'invalid_cik',
    message: 'CIK must be a string of exactly 10 digits.',
    detail: { value: '123' },
  },
};

const codes = Object.keys(triggers) as EngineErrorCode[];

describe('EngineError codes (Req 15.5)', () => {
  it('covers all 14 codes', () => {
    expect(codes).toHaveLength(14);
    expect(Object.keys(expected).sort()).toEqual([...codes].sort());
  });

  it.each(codes)('%s: exact code, message and detail', async (code) => {
    const error = await triggers[code]();
    expect(error).toEqual(expected[code]);
    expect(error.code).toBe(code);
    // Absent detail must be absent, not undefined-valued.
    expect('detail' in error).toBe(expected[code].detail !== undefined);
  });
});
