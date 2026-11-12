import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { compareMasks, comparePngs, rasterise, sharedFrame } from './silhouette.mjs';

const png = (draw) => {
  const px = Buffer.alloc(20 * 20 * 3, 255);
  draw((x, y) => px.fill(0, (y * 20 + x) * 3, (y * 20 + x) * 3 + 3));
  return sharp(px, { raw: { width: 20, height: 20, channels: 3 } }).png().toBuffer();
};

describe('silhouette helper', () => {
  it('rasterises a square triangle pair and compares masks', () => {
    const sq = [[0, 0, 1, 0, 1, 1], [0, 0, 1, 1, 0, 1]];
    const frame = sharedFrame([{ x0: 0, y0: 0, x1: 1, y1: 1 }]);
    const a = rasterise(sq, frame, 40);
    expect(compareMasks(a, a)).toMatchObject({ xor: 0, iou: 1 });
    const half = rasterise([[0, 0, 1, 0, 1, 1]], frame, 40);
    const r = compareMasks(a, half);
    expect(r.xor).toBeGreaterThan(0.4);
    expect(r.xor).toBeLessThan(0.6);
    expect(r.iou).toBeCloseTo(0.5, 1);
  });

  it('measures XOR and IoU of two PNG silhouettes', async () => {
    const a = await png((d) => { for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) d(x, y); });
    const b = await png((d) => { for (let y = 0; y < 10; y++) for (let x = 0; x < 5; x++) d(x, y); });
    const r = await comparePngs(a, b);
    expect(r.xor).toBeCloseTo(0.5);
    expect(r.iou).toBeCloseTo(0.5);
  });
});
