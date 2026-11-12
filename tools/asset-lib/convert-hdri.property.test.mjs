// Feature: asset-pipeline, Property 13: HDRI is copied unchanged and width is enforced
// **Validates: Requirements 16.3, 16.7**
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseHdrHeader, convertHdri, hdriFileName, HDRI_WIDTHS } from './convert-hdri.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

function makeHdr(width, height, payload) {
  const head = Buffer.from(
    `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.0\n\n-Y ${height} +X ${width}\n`,
    'latin1',
  );
  return new Uint8Array(Buffer.concat([head, Buffer.from(payload)]));
}

const payloadArb = fc.uint8Array({ minLength: 0, maxLength: 64 });
const heightArb = fc.integer({ min: 1, max: 4096 });
const widthArb = fc.oneof(fc.constantFrom(1024, 2048), fc.integer({ min: 1, max: 8192 }));
const roleArb = fc.constantFrom('background', 'environment');
const idArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,20}$/);

describe('Property 13: HDRI is copied unchanged and width is enforced', () => {
  it('output has the same SHA-256 as the input when the width matches the role', async () => {
    await fc.assert(
      fc.asyncProperty(roleArb, idArb, heightArb, payloadArb, fc.constantFrom('1k', '2k'), async (role, id, h, payload, res) => {
        const pick = { id, role, source: { resolution: res } };
        const bytes = makeHdr(HDRI_WIDTHS[role], h, payload);
        const r = await convertHdri(pick, bytes);
        expect(r.ok).toBe(true);
        expect(r.produced).toHaveLength(1);
        expect(sha(r.produced[0].bytes)).toBe(sha(bytes));
        expect(r.produced[0].width).toBe(HDRI_WIDTHS[role]);
        expect(r.produced[0].height).toBe(h);
        expect(r.produced[0].fileName).toBe(hdriFileName(pick));
        expect(r.produced[0].fileName).toBe(`${id}_${res}.hdr`);
      }),
      { numRuns: 100 },
    );
  });

  it('accepts a file if and only if width equals 2048 (background) or 1024 (environment)', async () => {
    await fc.assert(
      fc.asyncProperty(roleArb, widthArb, heightArb, payloadArb, async (role, w, h, payload) => {
        const pick = { id: 'x', role, source: { resolution: '1k' } };
        const bytes = makeHdr(w, h, payload);
        const parsed = parseHdrHeader(bytes);
        expect(parsed).toEqual({ ok: true, width: w, height: h });
        const r = await convertHdri(pick, bytes);
        expect(r.ok).toBe(w === (role === 'background' ? 2048 : 1024));
        if (!r.ok) expect(r.error.code).toBe('WidthMismatch');
      }),
      { numRuns: 100 },
    );
  });
});
