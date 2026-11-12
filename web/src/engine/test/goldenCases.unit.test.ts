import { describe, expect, it } from 'vitest';
import { parseGoldenCases } from './goldenCases';

const FILE = 'data/fixtures/icr_cases.json';

describe('parseGoldenCases', () => {
  it('accepts the documented format', () => {
    const text = JSON.stringify({
      cases: [
        { ebit: -10, interest: 100, expected: -0.1, note: 'negative' },
        { ebit: null, interest: 10, expected: null },
      ],
    });
    expect(parseGoldenCases(text, FILE)).toEqual([
      { ebit: -10, interest: 100, expected: -0.1, note: 'negative' },
      { ebit: null, interest: 10, expected: null },
    ]);
  });

  it('rejects invalid JSON and names the file', () => {
    expect(() => parseGoldenCases('{ not json', FILE)).toThrow(FILE);
  });

  it('rejects a wrong top-level shape and names the file', () => {
    expect(() => parseGoldenCases('[]', FILE)).toThrow(FILE);
    expect(() => parseGoldenCases('{"cases":[],"extra":1}', FILE)).toThrow(FILE);
  });

  it.each([
    ['a missing field', { ebit: 1, interest: 2 }],
    ['a wrongly typed field', { ebit: '1', interest: 2, expected: 0.5 }],
    ['an unexpected field', { ebit: 1, interest: 2, expected: 0.5, extra: true }],
    ['a non-string note', { ebit: 1, interest: 2, expected: 0.5, note: 3 }],
    ['a non-object case', 42],
  ])('rejects %s and names the file and case index', (_label, bad) => {
    const text = JSON.stringify({ cases: [{ ebit: 1, interest: 2, expected: 0.5 }, bad] });
    expect(() => parseGoldenCases(text, FILE)).toThrow(new RegExp(`${FILE}.*case 1\\b`));
  });
});
