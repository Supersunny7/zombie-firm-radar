// Feature: asset-pipeline, Property 6: CMU credit line appears exactly once
// **Validates: Requirements 18.6**
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ensureCmuLine, CMU_SENTENCE } from './credits.mjs';

const numRuns = 200;

const filler = fc.oneof(
  fc.constant(''),
  fc.constant('## Motion capture'),
  fc.constant('## Assets'),
  fc.constant('# Credits'),
  fc.constant('| a | b | c | d | e | f |'),
  fc.stringMatching(/^[A-Za-z0-9 .,:_-]{0,30}$/),
);
const line = fc.oneof({ weight: 3, arbitrary: filler }, { weight: 1, arbitrary: fc.constant(CMU_SENTENCE) });
const content = fc
  .tuple(fc.array(line, { maxLength: 15 }), fc.constantFrom('\n', '\r\n'), fc.boolean())
  .map(([lines, eol, trailing]) => lines.join(eol) + (trailing && lines.length > 0 ? eol : ''));

const count = (text) => text.split(CMU_SENTENCE).length - 1;

describe('Property 6: CMU credit line appears exactly once', () => {
  it('has exactly one copy when CMU picks exist', () => {
    fc.assert(
      fc.property(content, (md) => {
        expect(count(ensureCmuLine(md, true))).toBe(1);
      }),
      { numRuns },
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(content, (md) => {
        const once = ensureCmuLine(md, true);
        expect(ensureCmuLine(once, true)).toBe(once);
      }),
      { numRuns },
    );
  });

  it('leaves content unchanged when CMU is not used', () => {
    fc.assert(
      fc.property(content, (md) => {
        expect(ensureCmuLine(md, false)).toBe(md);
      }),
      { numRuns },
    );
  });

  it('keeps content with exactly one copy byte for byte', () => {
    fc.assert(
      fc.property(content, (md) => {
        fc.pre(count(md) === 1);
        expect(ensureCmuLine(md, true)).toBe(md);
      }),
      { numRuns },
    );
  });
});
