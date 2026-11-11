// Feature: app-shell, Property 10: Data path resolution never escapes the data folder
// **Validates: Requirements 5.1, 5.5**
import path from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { resolveInsideData } from './dataPlugin';

const dataDir = path.resolve('some', 'repo', 'data');

const segment = fc.oneof(
  fc.constantFrom(
    '..',
    '.',
    '%2e%2e',
    '%2E%2E',
    '%2e.',
    '.%2e',
    '%2f',
    '%5c',
    '%00',
    '\0',
    '%',
    '%zz',
    '..\\',
    '\\',
    '/',
    'C:',
    'C:\\Windows',
    '/etc/passwd',
    '\\\\server\\share',
    'firms',
    'mock',
    'firms_index.json',
  ),
  fc.string({ maxLength: 8 }),
);

const separator = fc.constantFrom('/', '\\', '//', '%2f', '%5c');

const arbUrlPath = fc.oneof(
  fc.tuple(fc.array(segment, { maxLength: 8 }), separator).map(([parts, sep]) => parts.join(sep)),
  fc
    .array(fc.tuple(separator, segment), { maxLength: 8 })
    .map((pairs) => pairs.map(([s, seg]) => s + seg).join('')),
  fc.string({ maxLength: 40 }),
  fc.string({ unit: 'binary', maxLength: 40 }),
);

function isInside(root: string, p: string): boolean {
  return p === root || p.startsWith(root + path.sep);
}

describe('Property 10: Data path resolution never escapes the data folder', () => {
  it('returns null or a path inside dataDir', () => {
    fc.assert(
      fc.property(arbUrlPath, (urlPath) => {
        const result = resolveInsideData(dataDir, urlPath);
        if (result === null) return true;
        return (
          path.isAbsolute(result) &&
          isInside(path.resolve(dataDir), result) &&
          !result.includes('\0')
        );
      }),
      { numRuns: 500 },
    );
  });

  it('also holds with query and hash suffixes', () => {
    fc.assert(
      fc.property(arbUrlPath, fc.constantFrom('?', '#'), arbUrlPath, (a, mark, b) => {
        const result = resolveInsideData(dataDir, a + mark + b);
        return result === null || isInside(path.resolve(dataDir), result);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects known traversal and absolute examples', () => {
    for (const p of [
      '../secret.json',
      '%2e%2e/secret.json',
      '..%5csecret.json',
      '..\\secret.json',
      'firms/../../x',
      'a%00b.json',
      'C:/Windows/win.ini',
      '//etc/../../x',
    ]) {
      const r = resolveInsideData(dataDir, p);
      expect(r === null || isInside(path.resolve(dataDir), r)).toBe(true);
    }
    expect(resolveInsideData(dataDir, '../secret.json')).toBeNull();
    expect(resolveInsideData(dataDir, 'a%00b.json')).toBeNull();
    expect(resolveInsideData(dataDir, 'firms_index.json')).toBe(
      path.join(path.resolve(dataDir), 'firms_index.json'),
    );
  });
});
