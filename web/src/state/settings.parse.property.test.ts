// Feature: app-shell, Property 6: Settings parsing never throws and falls back per field
// parseSettings never throws on arbitrary input. Each invalid field falls back to its default
// while valid fields are kept.
// **Validates: Requirements 9.2, 9.8**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbSettings } from '../test/arbitraries';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings, type Settings } from './settings';

const FIELDS = ['lights', 'sound', 'lowQuality', 'reducedMotion'] as const;
type Field = (typeof FIELDS)[number];

// Values that are never valid for any settings field.
const arbInvalidValue: fc.Arbitrary<unknown> = fc.oneof(
  fc.string().filter((s) => s !== 'on' && s !== 'off'),
  fc.integer(),
  fc.double({ noNaN: true }),
  fc.constant(undefined),
  fc.array(fc.anything(), { maxLength: 3 }),
  fc.dictionary(fc.string(), fc.string(), { maxKeys: 2 }),
);

// Per-field invalid values: a boolean is invalid for `lights`, 'on'/'off' is invalid elsewhere.
function arbInvalidFor(field: Field): fc.Arbitrary<unknown> {
  if (field === 'lights') return fc.oneof(arbInvalidValue, fc.boolean(), fc.constant(null));
  if (field === 'reducedMotion') return fc.oneof(arbInvalidValue, fc.constantFrom('on', 'off'));
  return fc.oneof(arbInvalidValue, fc.constant(null), fc.constantFrom('on', 'off'));
}

describe('Property 6: Settings parsing never throws and falls back per field', () => {
  it('never throws on arbitrary strings and null', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constant(null), fc.string({ unit: 'binary' })),
        (raw) => {
          const result = parseSettings(raw);
          expect(FIELDS.every((f) => f in result)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('non-object JSON values yield defaults', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.string(),
          fc.boolean(),
          fc.constant(null),
          fc.array(fc.jsonValue(), { maxLength: 4 }),
        ),
        (v) => {
          expect(parseSettings(JSON.stringify(v))).toEqual(DEFAULT_SETTINGS);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('keeps valid fields and falls back to defaults for invalid ones', () => {
    fc.assert(
      fc.property(
        arbSettings,
        fc.record({
          lights: fc.boolean(),
          sound: fc.boolean(),
          lowQuality: fc.boolean(),
          reducedMotion: fc.boolean(),
        }),
        fc.record({
          lights: arbInvalidFor('lights'),
          sound: arbInvalidFor('sound'),
          lowQuality: arbInvalidFor('lowQuality'),
          reducedMotion: arbInvalidFor('reducedMotion'),
        }),
        fc.dictionary(
          fc
            .string()
            .filter((k) => !(FIELDS as readonly string[]).includes(k) && k !== '__proto__'),
          fc.jsonValue(),
          { maxKeys: 3 },
        ),
        (valid, corrupt, bad, extra) => {
          const obj: Record<string, unknown> = { ...extra };
          const expected: Settings = { ...DEFAULT_SETTINGS };
          for (const f of FIELDS) {
            if (corrupt[f]) {
              obj[f] = bad[f];
            } else {
              obj[f] = valid[f];
              (expected as unknown as Record<string, unknown>)[f] = valid[f];
            }
          }
          // JSON.stringify drops `undefined`, which is the same as a missing key (also invalid).
          const result = parseSettings(JSON.stringify(obj));
          expect(result).toEqual(expected);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('a fully valid serialized object is kept as is', () => {
    fc.assert(
      fc.property(arbSettings, (s) => {
        expect(parseSettings(serializeSettings(s))).toEqual(s);
      }),
      { numRuns: 100 },
    );
  });
});
