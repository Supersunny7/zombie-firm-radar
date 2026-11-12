import { describe, it } from 'vitest';
import fc from 'fast-check';
import { rewriteTgaRefs } from './fbx-textures.mjs';

// Property: the rewrite changes only ".tga" -> ".png" inside path strings and keeps length and other bytes.
describe('rewriteTgaRefs (property)', () => {
  it('changes only the extension bytes and keeps length', () => {
    const name = fc.stringMatching(/^[a-z][a-z0-9_]{0,12}$/);
    const chunk = fc.oneof(
      fc.uint8Array({ minLength: 0, maxLength: 12 }).map((u) => Buffer.from(u)),
      name.map((n) => ({ n })),
    );
    fc.assert(
      fc.property(fc.array(chunk, { maxLength: 8 }), (chunks) => {
        const parts = [];
        const expected = [];
        for (const c of chunks) {
          if (Buffer.isBuffer(c)) {
            // keep random bytes free of accidental ".tga" so the expectation stays exact
            const safe = Buffer.from(c.toString('latin1').replace(/\.tga/gi, '.xxx'), 'latin1');
            parts.push(safe);
            expected.push(safe);
          } else {
            parts.push(Buffer.from(`textures\\${c.n}.tga`, 'latin1'), Buffer.from([0]));
            expected.push(Buffer.from(`textures\\${c.n}.png`, 'latin1'), Buffer.from([0]));
          }
        }
        const input = Buffer.concat(parts);
        const out = rewriteTgaRefs(input);
        if (out.length !== input.length) return false;
        return Buffer.compare(out, Buffer.concat(expected)) === 0;
      }),
    );
  });
});
