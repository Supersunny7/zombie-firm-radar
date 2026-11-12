import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { convertHdri, parseHdrHeader, hdriFileName, HDRI_WIDTHS } from './convert-hdri.mjs';

/** Synthetic .hdr: real header, arbitrary payload. */
function makeHdr(width, height = 4, { magic = '#?RADIANCE', res } = {}) {
  const header = `${magic}\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.0\n\n${res ?? `-Y ${height} +X ${width}`}\n`;
  return Buffer.concat([Buffer.from(header, 'latin1'), Buffer.from([1, 2, 3, 4, 255, 0, 128, 7])]);
}

const pick = (role, resolution) => ({ id: `hdri-${role}`, kind: 'hdri', role, source: { type: 'polyhaven', id: 'x', resolution } });

describe('parseHdrHeader', () => {
  it('reads width and height', () => {
    expect(parseHdrHeader(makeHdr(2048, 1024))).toEqual({ ok: true, width: 2048, height: 1024 });
  });
  it('accepts #?RGBE and CRLF line endings', () => {
    expect(parseHdrHeader(makeHdr(1024, 512, { magic: '#?RGBE' })).width).toBe(1024);
    const crlf = Buffer.from('#?RADIANCE\r\nFORMAT=32-bit_rle_rgbe\r\n\r\n-Y 2 +X 8\r\n', 'latin1');
    expect(parseHdrHeader(crlf)).toEqual({ ok: true, width: 8, height: 2 });
  });
  it('rejects bad magic, flipped orientation and truncated headers', () => {
    expect(parseHdrHeader(Buffer.from('PNG....')).code).toBe('NotRadiance');
    expect(parseHdrHeader(makeHdr(8, 2, { res: '+Y 2 +X 8' })).code).toBe('UnsupportedOrientation');
    expect(parseHdrHeader(Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 8')).code).toBe('HeaderTruncated');
    expect(parseHdrHeader(Buffer.from('#?RADIANCE\nFORMAT=x\n')).code).toBe('HeaderTruncated');
  });
});

describe('convertHdri', () => {
  let dir;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'hdri-test-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('requires the documented widths', () => {
    expect(HDRI_WIDTHS).toEqual({ background: 2048, environment: 1024 });
  });

  it('copies a 2048 wide background byte for byte', async () => {
    const bytes = makeHdr(2048);
    const file = path.join(dir, 'bg.hdr');
    await writeFile(file, bytes);
    const r = await convertHdri(pick('background', '2k'), file);
    expect(r.ok).toBe(true);
    expect(r.produced).toHaveLength(1);
    expect(r.produced[0].fileName).toBe('hdri-background_2k.hdr');
    expect(Buffer.from(r.produced[0].bytes).equals(bytes)).toBe(true);
  });

  it('accepts a 1024 wide environment from bytes', async () => {
    const r = await convertHdri(pick('environment', '1k'), makeHdr(1024));
    expect(r.ok).toBe(true);
    expect(r.produced[0].width).toBe(1024);
  });

  it('fails the pick on a width mismatch', async () => {
    const r = await convertHdri(pick('background', '2k'), makeHdr(1024));
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ id: 'hdri-background', code: 'WidthMismatch' });
    const r2 = await convertHdri(pick('environment', '1k'), makeHdr(2048));
    expect(r2.error.code).toBe('WidthMismatch');
  });

  it('fails on missing role, unreadable file and corrupt header', async () => {
    expect((await convertHdri({ id: 'a', kind: 'hdri', source: { resolution: '1k' } }, makeHdr(1024))).error.code).toBe('InvalidRole');
    expect((await convertHdri(pick('background', '2k'), path.join(dir, 'missing.hdr'))).error.code).toBe('ReadError');
    expect((await convertHdri(pick('background', '2k'), Buffer.from('garbage'))).error.code).toBe('NotRadiance');
  });

  it('names the output <id>_<res>.hdr', () => {
    expect(hdriFileName(pick('environment', '1k'))).toBe('hdri-environment_1k.hdr');
  });
});
