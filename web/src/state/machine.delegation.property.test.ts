// Feature: rescue-engine, Property 4: The state machine delegates treatment parsing
// For any input (valid treatments, corrupted treatments and arbitrary junk), the machine's
// parseTreatment returns ok: true with the engine's value exactly when the engine accepts it,
// otherwise ok: false with reason equal to the engine error's message.
// **Validates: Requirements 3.2**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseTreatment as parseEngineTreatment } from '../engine/treatment';
import { arbBadTreatment, arbTreatment } from '../engine/test/engineArbitraries';
import { parseTreatment } from './machine';

describe('Property 4: the state machine delegates treatment parsing', () => {
  it('matches the engine parser for valid, corrupted and junk inputs', () => {
    let accepted = 0;
    let rejected = 0;
    fc.assert(
      fc.property(
        fc.oneof(
          arbTreatment,
          arbBadTreatment.map((b) => b.value),
          fc.anything(),
        ),
        (input) => {
          const engine = parseEngineTreatment(input);
          const machine = parseTreatment(input);
          if (engine.ok) {
            accepted++;
            expect(machine.ok).toBe(true);
            if (machine.ok) expect(machine.value).toEqual(engine.value);
          } else {
            rejected++;
            expect(machine.ok).toBe(false);
            if (!machine.ok) expect(machine.reason).toBe(engine.error.message);
          }
        },
      ),
      { numRuns: 200 },
    );
    // Guard against a vacuous run.
    expect(accepted).toBeGreaterThan(0);
    expect(rejected).toBeGreaterThan(0);
  });
});
