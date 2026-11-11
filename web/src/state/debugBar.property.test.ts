// Feature: app-shell, Property 12: Debug bar default visibility
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { initialDebugBar } from './store';

const arbKey = fc.stringMatching(/^[a-z][a-z0-9_]{0,8}$/).filter((k) => k !== 'debug');
const arbValue = fc.stringMatching(/^[a-zA-Z0-9_-]{0,6}$/);
const arbPair = fc.tuple(arbKey, arbValue);

/** Debug value: absent, "1", or any other value (including "0"). */
const arbDebug = fc.oneof(
  fc.constant<string | null>(null),
  fc.constant<string | null>('1'),
  fc.constant<string | null>('0'),
  arbValue.map((v): string | null => v),
);

const arbSearch = fc
  .record({
    before: fc.array(arbPair, { maxLength: 4 }),
    after: fc.array(arbPair, { maxLength: 4 }),
    debug: arbDebug,
    prefix: fc.boolean(),
  })
  .map(({ before, after, debug, prefix }) => {
    const parts = before.map(([k, v]) => `${k}=${v}`);
    if (debug !== null) parts.push(`debug=${debug}`);
    parts.push(...after.map(([k, v]) => `${k}=${v}`));
    return {
      search: (prefix ? '?' : '') + parts.join('&'),
      debug,
    };
  });

describe('Property 12: Debug bar default visibility', () => {
  it('is visible iff isDev or the query has debug=1', () => {
    fc.assert(
      fc.property(fc.boolean(), arbSearch, (isDev, { search, debug }) => {
        expect(initialDebugBar(isDev, search)).toBe(isDev || debug === '1');
      }),
      { numRuns: 200 },
    );
  });

  it('is always visible in development for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (search) => {
        expect(initialDebugBar(true, search)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('is hidden in production for queries without debug=1', () => {
    fc.assert(
      fc.property(fc.array(arbPair, { maxLength: 5 }), fc.boolean(), (pairs, prefix) => {
        const search = (prefix ? '?' : '') + pairs.map(([k, v]) => `${k}=${v}`).join('&');
        expect(initialDebugBar(false, search)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('handles concrete examples', () => {
    expect(initialDebugBar(false, '')).toBe(false);
    expect(initialDebugBar(false, '?debug=0')).toBe(false);
    expect(initialDebugBar(false, '?debug=1')).toBe(true);
    expect(initialDebugBar(false, 'debug=1')).toBe(true);
    expect(initialDebugBar(false, '?a=b&debug=1&c=d')).toBe(true);
    expect(initialDebugBar(false, '?debug=10')).toBe(false);
    expect(initialDebugBar(true, '?debug=0')).toBe(true);
  });
});
