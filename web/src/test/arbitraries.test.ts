import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { guardFirm, guardFirmsIndex, guardMacro } from '../data/guards';
import { arbCorruption, arbFirm, arbFirmsIndex, arbMacro } from './arbitraries';

const roundTrip = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('data arbitraries', () => {
  it('arbFirmsIndex values pass guardFirmsIndex, also after a JSON round trip', () => {
    fc.assert(
      fc.property(arbFirmsIndex, (v) => {
        expect(guardFirmsIndex(v).ok).toBe(true);
        expect(guardFirmsIndex(roundTrip(v)).ok).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('arbFirm values pass guardFirm, also after a JSON round trip', () => {
    fc.assert(
      fc.property(arbFirm, (v) => {
        expect(guardFirm(v).ok).toBe(true);
        expect(guardFirm(roundTrip(v)).ok).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('arbMacro values pass guardMacro, also after a JSON round trip', () => {
    fc.assert(
      fc.property(arbMacro, (v) => {
        expect(guardMacro(v).ok).toBe(true);
        expect(guardMacro(roundTrip(v)).ok).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('arbCorruption yields values the guard rejects, naming the corrupted path', () => {
    fc.assert(
      fc.property(
        arbFirm.chain((firm) => arbCorruption(firm)),
        (c) => {
          const r = guardFirm(c.value);
          expect(r.ok).toBe(false);
          if (!r.ok) expect(r.path).toBe(c.path);
        },
      ),
      { numRuns: 100 },
    );
  });
});
