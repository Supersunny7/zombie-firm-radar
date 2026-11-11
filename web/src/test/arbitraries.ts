/**
 * Shared fast-check arbitraries.
 * Task 5.3 will extend this file with the data and settings arbitraries
 * (arbStatus, arbFirmIndexEntry, arbFirmsIndex, arbFirm, arbMacro, arbSettings, arbCorruption).
 */
import fc from 'fast-check';
import type { GameEvent } from '../state/types';

/** Valid 10-digit zero-padded CIK string. */
export const arbCik = fc.stringMatching(/^\d{10}$/);

const arbResult = fc.constantFrom('revived', 'undead', 'liquidated');

const arbToolParams = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 8 }).filter((k) => k !== '__proto__'),
  fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.boolean()),
  { maxKeys: 4 },
);

const arbTool = fc.record({
  name: fc.string({ minLength: 1, maxLength: 12 }),
  params: arbToolParams,
});

/** Valid treatment: 0 to 3 tools. */
const arbTreatment = fc.array(arbTool, { minLength: 0, maxLength: 3 });

/** Valid rate shock: finite, 0 to 0.05 inclusive. */
const arbShock = fc.double({ min: 0, max: 0.05, noNaN: true });

/** Any valid event with a valid payload (it may still be invalid for the current state). */
export const arbEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  arbCik.map((cik): GameEvent => ({ type: 'selectFirm', cik })),
  fc.constant<GameEvent>({ type: 'captureDone' }),
  fc
    .record({ treatment: arbTreatment, result: arbResult })
    .map(({ treatment, result }): GameEvent => ({ type: 'pullSwitch', treatment, result })),
  fc.constant<GameEvent>({ type: 'continue' }),
  fc.constant<GameEvent>({ type: 'cancel' }),
  arbShock.map((value): GameEvent => ({ type: 'setRateShock', value })),
  arbTreatment.map((treatment): GameEvent => ({ type: 'setTreatment', treatment })),
  arbResult.map((result): GameEvent => ({ type: 'setResult', result })),
);

/** Arbitrary payload, including NaN, infinities, out-of-range numbers and junk. */
const arbJunk: fc.Arbitrary<unknown> = fc.oneof(
  fc.constantFrom(
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0.01,
    0.0500001,
    1,
    -1,
    null,
    undefined,
    '',
    '123',
    '12345678901',
    'abcdefghij',
  ),
  fc.double(),
  fc.string(),
  fc.boolean(),
  fc.anything(),
  // Treatments with 4 or more tools, and tools with bad shapes.
  fc.array(arbTool, { minLength: 4, maxLength: 6 }),
  fc.array(fc.anything(), { maxLength: 5 }),
);

/** Events with arbitrary, usually invalid, payloads. */
export const arbBadEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  arbJunk.map((cik): GameEvent => ({ type: 'selectFirm', cik })),
  fc.constant<GameEvent>({ type: 'captureDone' }),
  fc
    .record({ treatment: arbJunk, result: arbJunk })
    .map(({ treatment, result }): GameEvent => ({ type: 'pullSwitch', treatment, result })),
  fc.constant<GameEvent>({ type: 'continue' }),
  fc.constant<GameEvent>({ type: 'cancel' }),
  arbJunk.map((value): GameEvent => ({ type: 'setRateShock', value })),
  arbJunk.map((treatment): GameEvent => ({ type: 'setTreatment', treatment })),
  arbJunk.map((result): GameEvent => ({ type: 'setResult', result })),
);
