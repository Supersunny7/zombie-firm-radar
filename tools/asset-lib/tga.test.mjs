import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { decodeTga, tgaToPng, TgaError } from './tga.mjs';
import { buildTga } from './test-helpers/tga-builder.mjs';

const px3 = [
  [255, 0, 0], [0, 255, 0],
  [0, 0, 255], [10, 20, 30],
];
const px4 = px3.map((p, i) => [...p, 50 + i * 60]);

describe('decodeTga', () => {
  it('decodes 24 bpp bottom-left origin', () => {
    const t = decodeTga(buildTga({ width: 2, height: 2, bpp: 24, pixels: px3 }));
    expect(t).toMatchObject({ width: 2, height: 2, channels: 3 });
    expect([...t.data]).toEqual(px3.flat());
  });

  it('decodes 32 bpp top-left origin', () => {
    const t = decodeTga(buildTga({ width: 2, height: 2, bpp: 32, pixels: px4, topDown: true }));
    expect(t.channels).toBe(4);
    expect([...t.data]).toEqual(px4.flat());
  });

  it('decodes RLE with raw and repeat packets', () => {
    const rleBuf = buildTga({ width: 2, height: 2, bpp: 24, pixels: px3, rle: true });
    expect([...decodeTga(rleBuf).data]).toEqual(px3.flat());
    const header = buildTga({ width: 2, height: 2, bpp: 24, pixels: px3 }).subarray(0, 18);
    header[2] = 10;
    header[17] = 0x20;
    const repeat = Buffer.concat([header, Buffer.from([0x83, 3, 2, 1])]); // 4 px of RGB(1,2,3)
    expect([...decodeTga(repeat).data]).toEqual(Array(4).fill([1, 2, 3]).flat());
  });

  it('decodes greyscale and skips the ID field', () => {
    const t = decodeTga(buildTga({ width: 2, height: 2, bpp: 8, grey: true, idLen: 5, pixels: [[1], [2], [3], [4]] }));
    expect(t.channels).toBe(1);
    expect([...t.data]).toEqual([1, 2, 3, 4]);
  });

  it('throws TruncatedTga on short data', () => {
    const buf = buildTga({ width: 2, height: 2, bpp: 24, pixels: px3 }).subarray(0, 25);
    expect(() => decodeTga(buf)).toThrow(TgaError);
    try {
      decodeTga(buf);
    } catch (e) {
      expect(e.code).toBe('TruncatedTga');
    }
  });

  it('throws UnsupportedTga on colour-mapped type and 16 bpp', () => {
    const a = buildTga({ width: 2, height: 2, bpp: 24, pixels: px3 });
    a[2] = 1;
    expect(() => decodeTga(a)).toThrow(expect.objectContaining({ code: 'UnsupportedTga' }));
    const b = buildTga({ width: 2, height: 2, bpp: 24, pixels: px3 });
    b[16] = 16;
    expect(() => decodeTga(b)).toThrow(expect.objectContaining({ code: 'UnsupportedTga' }));
  });
});

describe('tgaToPng', () => {
  it('writes a PNG with the same pixels', async () => {
    const png = await tgaToPng(decodeTga(buildTga({ width: 2, height: 2, bpp: 24, pixels: px3 })));
    const { data } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    expect([...data]).toEqual(px3.flat());
  });

  it('shrinks to the limit', async () => {
    const pixels = Array.from({ length: 64 * 32 }, () => [1, 2, 3]);
    const tga = decodeTga(buildTga({ width: 64, height: 32, bpp: 24, pixels }));
    const meta = await sharp(await tgaToPng(tga, 16)).metadata();
    expect([meta.width, meta.height]).toEqual([16, 8]);
  });
});
