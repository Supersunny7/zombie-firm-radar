// Feature: app-shell, Property 1: Machine invariants hold for any event sequence
// For any sequence of 0 to 100 events (valid or arbitrary), applying them through
// transition from initialMachine() leaves the machine in one of the four states, with a
// Treatment of at most 3 tools and a finite Rate_Shock within 0 to 0.05.
// **Validates: Requirements 3.1, 3.11, 3.12, 3.17**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbBadEvent, arbEvent } from '../test/arbitraries';
import { initialMachine, transition } from './machine';

const STATES = ['graveyard', 'capture', 'lab', 'outcome'];

describe('Property 1: machine invariants', () => {
  it('holds for any event sequence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbEvent, arbBadEvent), { minLength: 0, maxLength: 100 }),
        (events) => {
          let m = initialMachine();
          for (const e of events) {
            const out = transition(m, e);
            m = out.machine;
            expect(STATES).toContain(m.state);
            expect(m.ctx.treatment.length).toBeLessThanOrEqual(3);
            expect(Number.isFinite(m.ctx.rateShock)).toBe(true);
            expect(m.ctx.rateShock).toBeGreaterThanOrEqual(0);
            expect(m.ctx.rateShock).toBeLessThanOrEqual(0.05);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
