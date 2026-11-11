// Feature: app-shell, Property 5: Settings round trip
// For any valid Settings value, parseSettings(serializeSettings(s)) deep-equals s, and
// writeSettings followed by readSettings on an in-memory storage returns an equal value.
// **Validates: Requirements 9.5, 9.6, 9.11**
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbSettings } from '../test/arbitraries';
import { parseSettings, serializeSettings } from './settings';
import { readSettings, SETTINGS_KEY, writeSettings } from './settingsStorage';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('Property 5: Settings round trip', () => {
  it('parseSettings(serializeSettings(s)) deep-equals s', () => {
    fc.assert(
      fc.property(arbSettings, (s) => {
        expect(parseSettings(serializeSettings(s))).toEqual(s);
      }),
      { numRuns: 200 },
    );
  });

  it('writeSettings then readSettings on in-memory storage returns an equal value', () => {
    fc.assert(
      fc.property(arbSettings, (s) => {
        const storage = memoryStorage();
        expect(writeSettings(s, storage)).toBe(true);
        expect(storage.data.has(SETTINGS_KEY)).toBe(true);
        expect(readSettings(storage)).toEqual(s);
      }),
      { numRuns: 200 },
    );
  });
});
