// Feature: app-shell, Property 3: Data guards accept every JSON round trip of a valid value
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { guardFirm, guardFirmsIndex, guardMacro } from './guards';
import { arbFirm, arbFirmsIndex, arbMacro } from '../test/arbitraries';

const roundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('Property 3: Data guards accept every JSON round trip of a valid value', () => {
  /** **Validates: Requirements 7.1, 7.2, 7.3, 7.9** */
  it('guardFirmsIndex accepts JSON.parse(JSON.stringify(valid FirmsIndex))', () => {
    fc.assert(
      fc.property(arbFirmsIndex, (value) => {
        const result = guardFirmsIndex(roundTrip(value));
        if (!result.ok)
          throw new Error(`${result.path}: expected ${result.expected}, got ${result.actual}`);
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('guardFirm accepts JSON.parse(JSON.stringify(valid Firm))', () => {
    fc.assert(
      fc.property(arbFirm, (value) => {
        const result = guardFirm(roundTrip(value));
        if (!result.ok)
          throw new Error(`${result.path}: expected ${result.expected}, got ${result.actual}`);
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('guardMacro accepts JSON.parse(JSON.stringify(valid Macro))', () => {
    fc.assert(
      fc.property(arbMacro, (value) => {
        const result = guardMacro(roundTrip(value));
        if (!result.ok)
          throw new Error(`${result.path}: expected ${result.expected}, got ${result.actual}`);
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
