// HDRI "conversion" (design: "HDRIs"): no format change. Verify the Radiance .hdr width
// and keep the bytes unchanged. Requirements 16.3, 16.7.

import { readFile } from 'node:fs/promises';

/** Required width per pick role (Requirement 16.7). */
export const HDRI_WIDTHS = { background: 2048, environment: 1024 };

const MAX_HEADER_BYTES = 4096;

/**
 * Parse a Radiance .hdr header. Pure.
 * Returns { ok: true, width, height } or { ok: false, code, message }.
 * Accepts the standard resolution line `-Y <h> +X <w>`.
 */
export function parseHdrHeader(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const head = Buffer.from(buf.subarray(0, Math.min(buf.length, MAX_HEADER_BYTES))).toString('latin1');
  if (!head.startsWith('#?RADIANCE') && !head.startsWith('#?RGBE')) {
    return { ok: false, code: 'NotRadiance', message: 'missing #?RADIANCE or #?RGBE magic' };
  }
  // The header ends at the first empty line; the newline-terminated resolution line follows it.
  const lines = head.split('\n');
  const blank = lines.findIndex((l) => l.trim() === '');
  // lines[last] is unterminated text, so the resolution line must not be the last element.
  if (blank === -1 || blank + 1 >= lines.length - 1) {
    return { ok: false, code: 'HeaderTruncated', message: 'header has no complete resolution line' };
  }
  const resolutionLine = lines[blank + 1];
  const m = /^-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/.exec(resolutionLine.replace(/\r$/, ''));
  if (!m) {
    return { ok: false, code: 'UnsupportedOrientation', message: `unsupported resolution line "${resolutionLine.trim()}" (expected "-Y <h> +X <w>")` };
  }
  const height = Number(m[1]);
  const width = Number(m[2]);
  if (width < 1 || height < 1) return { ok: false, code: 'InvalidSize', message: `invalid size ${width}x${height}` };
  return { ok: true, width, height };
}

/** Output file name: `<id>_<res>.hdr`, res is the source resolution ("1k", "2k"). */
export function hdriFileName(pick) {
  return `${pick.id}_${pick.source.resolution}.hdr`;
}

/**
 * Verify and pass through one HDRI.
 * `input` is a file path (string) or the bytes. Never throws for bad content.
 * Returns { ok: true, produced: [{ fileName, bytes, width, height }] } or
 * { ok: false, error: { id, code, message } }.
 */
export async function convertHdri(pick, input) {
  const fail = (code, message) => ({ ok: false, error: { id: pick?.id ?? null, code, message } });
  const required = HDRI_WIDTHS[pick?.role];
  if (required === undefined) {
    return fail('InvalidRole', `hdri pick needs role "background" or "environment", got ${JSON.stringify(pick?.role)}`);
  }
  let bytes;
  if (typeof input === 'string') {
    try {
      bytes = await readFile(input);
    } catch (e) {
      return fail('ReadError', `cannot read ${input}: ${e.message}`);
    }
  } else {
    bytes = input;
  }
  const header = parseHdrHeader(bytes);
  if (!header.ok) return fail(header.code, header.message);
  if (header.width !== required) {
    return fail(
      'WidthMismatch',
      `${pick.role} HDRI must be ${required} px wide, got ${header.width}; not resampled, pick a matching source resolution`,
    );
  }
  return {
    ok: true,
    produced: [{ fileName: hdriFileName(pick), bytes: new Uint8Array(bytes), width: header.width, height: header.height }],
  };
}
