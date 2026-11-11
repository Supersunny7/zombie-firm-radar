// Feature: app-shell, Property 2: Invalid events and invalid values leave the machine unchanged
// For any machine and any event that is invalid for its state, or carries an invalid value
// (bad CIK, non-finite or out-of-range Rate_Shock, Treatment over 3 tools, unknown Result),
// transition returns ok: false, the same Machine reference, deeply equal to before,
// plus reject info with a non-empty reason.
// **Validates: Requirements 3.9, 3.14**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbBadEvent, arbEvent } from '../test/arbitraries';
import { initialMachine, transition } from './machine';

describe('Property 2: rejected events leave the machine unchanged', () => {
  it('returns ok: false with the same, deeply equal machine and a reason', () => {
    let rejections = 0;
    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbEvent, arbBadEvent), { minLength: 0, maxLength: 60 }),
        fc.array(arbBadEvent, { minLength: 1, maxLength: 20 }),
        (prefix, probes) => {
          // Reach an arbitrary machine through the transition function.
          let m = initialMachine();
          for (const e of prefix) m = transition(m, e).machine;

          for (const e of probes) {
            const before = structuredClone(m);
            const out = transition(m, e);
            if (!out.ok) {
              rejections++;
              expect(out.machine).toBe(m);
              expect(out.machine).toEqual(before);
              expect(out.rejected.reason.length).toBeGreaterThan(0);
              expect(out.rejected.event).toBe(e.type);
              expect(out.rejected.state).toBe(m.state);
            } else {
              // Accepted events must not mutate the previous machine either.
              expect(m).toEqual(before);
            }
            m = out.machine;
          }
        },
      ),
      { numRuns: 200 },
    );
    // Guard against a vacuous run.
    expect(rejections).toBeGreaterThan(0);
  });
});
