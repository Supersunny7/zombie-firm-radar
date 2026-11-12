/**
 * Parser for the shared ICR golden cases (data/fixtures/icr_cases.json).
 * Format (proposed, to confirm with partner):
 * { "cases": [{ "ebit": number|null, "interest": number|null, "expected": number|null, "note"?: string }] }
 * Any other shape throws an Error naming the file path and, where relevant, the case index.
 */

export interface GoldenCase {
  ebit: number | null;
  interest: number | null;
  expected: number | null;
  note?: string;
}

const CASE_KEYS = new Set(['ebit', 'interest', 'expected', 'note']);
const NUMERIC_FIELDS = ['ebit', 'interest', 'expected'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function caseError(filePath: string, index: number, problem: string): Error {
  return new Error(`Golden cases file ${filePath}: case ${index} cannot be run: ${problem}.`);
}

function parseCase(raw: unknown, filePath: string, index: number): GoldenCase {
  if (!isPlainObject(raw)) throw caseError(filePath, index, 'case is not an object');
  for (const key of Object.keys(raw)) {
    if (!CASE_KEYS.has(key)) throw caseError(filePath, index, `unexpected field "${key}"`);
  }
  for (const field of NUMERIC_FIELDS) {
    if (!(field in raw)) throw caseError(filePath, index, `missing field "${field}"`);
    const v = raw[field];
    if (v !== null && typeof v !== 'number') {
      throw caseError(filePath, index, `field "${field}" must be a number or null`);
    }
  }
  if ('note' in raw && typeof raw.note !== 'string') {
    throw caseError(filePath, index, 'field "note" must be a string');
  }
  const result: GoldenCase = {
    ebit: raw.ebit as number | null,
    interest: raw.interest as number | null,
    expected: raw.expected as number | null,
  };
  if (typeof raw.note === 'string') result.note = raw.note;
  return result;
}

/** Parses the file text. Throws an Error naming `filePath` (and the case index) on any problem. */
export function parseGoldenCases(text: string, filePath: string): GoldenCase[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Golden cases file ${filePath} is not valid JSON: ${reason}`, { cause: err });
  }
  if (!isPlainObject(json) || !Array.isArray(json.cases) || Object.keys(json).length !== 1) {
    throw new Error(
      `Golden cases file ${filePath} must have the shape { "cases": [...] } and nothing else.`,
    );
  }
  return json.cases.map((raw, index) => parseCase(raw, filePath, index));
}
