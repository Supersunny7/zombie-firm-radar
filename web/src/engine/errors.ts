export type EngineErrorCode =
  | 'unknown_tool'
  | 'too_many_tools'
  | 'duplicate_tool'
  | 'param_out_of_range'
  | 'delta_out_of_range'
  | 'not_rescuable'
  | 'invalid_paths'
  | 'invalid_date'
  | 'worker_disposed'
  | 'superseded'
  | 'aborted'
  | 'invalid_treatment'
  | 'invalid_seed'
  | 'invalid_cik';

export type InputName = 'R' | 'E' | 'I' | 'D' | 'A' | 'Q' | 'b' | 'years';

export interface EngineError {
  readonly code: EngineErrorCode;
  readonly message: string;
  readonly detail?: {
    readonly tool?: string;
    readonly param?: string;
    readonly index?: number;
    readonly inputs?: readonly InputName[];
    readonly value?: unknown;
  };
}

export type EngineResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: EngineError };

const INPUT_LABELS: Readonly<Record<InputName, string>> = {
  R: 'revenue',
  E: 'EBIT',
  I: 'interest expense',
  D: 'total debt',
  A: 'total assets',
  Q: 'equity',
  b: 'the 10-year Treasury rate',
  years: 'fiscal years',
};

function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

export const ok = <T>(value: T): EngineResult<T> => ({ ok: true, value });
export const fail = <T = never>(error: EngineError): EngineResult<T> => ({ ok: false, error });

export const unknownTool = (tool: string, index?: number): EngineError => ({
  code: 'unknown_tool',
  message: `Unknown tool "${tool}". Available tools: cut_costs, sell_assets, debt_for_equity, refinance.`,
  detail: index === undefined ? { tool } : { tool, index },
});

export const tooManyTools = (count: number): EngineError => ({
  code: 'too_many_tools',
  message: `A treatment can use at most 3 tools, got ${count}.`,
  detail: { value: count },
});

export const duplicateTool = (tool: string): EngineError => ({
  code: 'duplicate_tool',
  message: `Each tool can be used only once, but "${tool}" appears twice.`,
  detail: { tool },
});

export const paramOutOfRange = (
  tool: string,
  param: string,
  value: unknown,
  range?: { readonly min: number; readonly max: number },
): EngineError => ({
  code: 'param_out_of_range',
  message: range
    ? `${tool} needs ${param} between ${range.min} and ${range.max}.`
    : `${tool} does not take the parameter "${param}".`,
  detail: { tool, param, value },
});

export const deltaOutOfRange = (value: unknown): EngineError => ({
  code: 'delta_out_of_range',
  message: 'Rate shock must be between 0 and 0.05.',
  detail: { value },
});

/** `fy` is the latest fiscal year when known. */
export const notRescuable = (
  inputs: readonly InputName[],
  reason: 'missing' | 'unusable',
  fy?: number,
): EngineError => {
  const names = joinWords(inputs.map((n) => INPUT_LABELS[n]));
  const suffix = fy === undefined ? '' : ` for FY${fy}`;
  const verb = reason === 'missing' ? 'missing' : 'unusable';
  return {
    code: 'not_rescuable',
    message: `Not rescuable: ${verb} ${names}${suffix}.`,
    detail: { inputs },
  };
};

export const invalidPaths = (value: unknown): EngineError => ({
  code: 'invalid_paths',
  message: 'Number of paths must be a whole number from 1 to 100000.',
  detail: { value },
});

export const invalidDate = (value: unknown): EngineError => ({
  code: 'invalid_date',
  message: 'Date must be a valid calendar date written as YYYY-MM-DD.',
  detail: { value },
});

export const workerDisposed = (): EngineError => ({
  code: 'worker_disposed',
  message: 'The simulation worker has been shut down.',
});

export const superseded = (): EngineError => ({
  code: 'superseded',
  message: 'A newer simulation request replaced this one.',
});

export const aborted = (): EngineError => ({
  code: 'aborted',
  message: 'The simulation request was cancelled.',
});

export const invalidTreatment = (index?: number, value?: unknown): EngineError => ({
  code: 'invalid_treatment',
  message:
    index === undefined
      ? 'Treatment must be a list of tools.'
      : `Tool ${index + 1} must be an object with a text name.`,
  detail: index === undefined ? { value } : { index, value },
});

export const invalidSeed = (value: unknown): EngineError => ({
  code: 'invalid_seed',
  message: 'Seed must be a whole number from 0 to 4294967295.',
  detail: { value },
});

export const invalidCik = (value: unknown): EngineError => ({
  code: 'invalid_cik',
  message: 'CIK must be a string of exactly 10 digits.',
  detail: { value },
});
