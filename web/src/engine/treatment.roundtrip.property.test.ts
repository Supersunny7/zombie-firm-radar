import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbTreatment } from './test/engineArbitraries';
import { deserialiseTreatment, parseTreatment, serialiseTreatment } from './treatment';

describe('treatment serialisation round trip', () => {
  // Feature: rescue-engine, Property 5: Treatment serialisation round trip
  // **Validates: Requirements 3.14, 10.3**
  it('deserialise(serialise(t)) deeply equals parseTreatment(t).value for any click order', () => {
    fc.assert(
      fc.property(arbTreatment, (t) => {
        const parsed = parseTreatment(t);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;

        const back = deserialiseTreatment(serialiseTreatment(parsed.value));
        expect(back.ok).toBe(true);
        if (!back.ok) return;

        expect(back.value).toEqual(parsed.value);
      }),
      { numRuns: 200 },
    );
  });
});
