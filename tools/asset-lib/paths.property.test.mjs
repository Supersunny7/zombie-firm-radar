// Feature: asset-pipeline, Property 9: Output paths follow kind and name and never escape
// **Validates: Requirements 14.4, 21.1, 21.9**
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { safeJoin, planOutputs, ASSET_ROOT, KIND_FOLDERS } from './paths.mjs';

const kinds = Object.keys(KIND_FOLDERS);
const idArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,30}$/);
const fileNameArb = fc.stringMatching(/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,30}$/).filter((n) => n !== '..' && n !== '.');

const segmentArb = fc.oneof(
  fc.constantFrom('..', '../..', '../x', 'a/../..', '/etc/passwd', '\\windows', 'C:\\Windows', 'C:/x', 'D:', '.', 'a/b', '', 'a\0b'),
  fc.string({ maxLength: 12 }),
  fc.stringMatching(/^[a-z0-9._\\/:-]{0,12}$/),
);

function inside(root, p) {
  const rel = path.relative(path.resolve(root), p);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

describe('Property 9: Output paths follow kind and name and never escape', () => {
  it('planOutputs places every file under <typeDir>/<name>/', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...kinds),
        idArb,
        fc.array(fileNameArb, { minLength: 0, maxLength: 5 }),
        (kind, id, names) => {
          const out = planOutputs({ kind, id }, names.map((fileName) => ({ fileName })));
          expect(out).toHaveLength(names.length);
          out.forEach((o, i) => {
            expect(o.relPath).toBe(`${KIND_FOLDERS[kind]}/${id}/${names[i]}`);
            const abs = path.resolve(ASSET_ROOT, ...o.relPath.split('/'));
            expect(inside(path.join(ASSET_ROOT, KIND_FOLDERS[kind], id), abs)).toBe(true);
          });
        },
      ),
      { numRuns: 200 },
    );
  });

  it('safeJoin returns a path inside root or throws, for any segments', () => {
    fc.assert(
      fc.property(fc.array(segmentArb, { minLength: 0, maxLength: 4 }), (segs) => {
        let result;
        try {
          result = safeJoin(ASSET_ROOT, ...segs);
        } catch {
          return;
        }
        expect(inside(ASSET_ROOT, result)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('safeJoin throws on traversal, absolute and drive-letter segments', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('..', '../x', 'a/../../b', '/abs', 'C:\\x', 'C:/x', 'D:\\y'),
        (bad) => {
          // Single segment, so the escape does not depend on earlier segments.
          expect(() => safeJoin(ASSET_ROOT, bad)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});
