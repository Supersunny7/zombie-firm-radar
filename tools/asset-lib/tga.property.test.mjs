import { describe, it } from 'vitest';
import fc from 'fast-check';
import sharp from 'sharp';
import { decodeTga, tgaToPng } from './tga.mjs';
import { buildTga } from './test-helpers/tga-builder.mjs';

// Property: TGA -> decode -> PNG round-trips pixel values for random size, bpp, origin and RLE.
describe('tga round trip (property)', () => {
  it('preserves pixel values through decode and PNG', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom(24, 32),
        fc.boolean(),
        fc.boolean(),
        fc.infiniteStream(fc.integer({ min: 0, max: 255 })),
        async (width, height, bpp, topDown, rle, stream) => {
          const it2 = stream[Symbol.iterator]();
          const ch = bpp / 8;
          const pixels = Array.from({ length: width * height }, () =>
            Array.from({ length: ch }, () => it2.next().value),
          );
          const tga = decodeTga(buildTga({ width, height, bpp, pixels, topDown, rle }));
          const png = await tgaToPng(tga);
          const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
          return (
            info.channels === ch &&
            Buffer.compare(data, Buffer.from(pixels.flat())) === 0
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
