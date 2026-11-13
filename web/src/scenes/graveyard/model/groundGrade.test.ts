import { describe, expect, it } from 'vitest';
import {
  GROUND_TEXELS_PER_M,
  GROUND_TINT_OFF,
  GROUND_TINT_ON,
  TILE_M,
  groundTint,
} from './groundGrade';

describe('ground grade (6.1)', () => {
  it('keeps at least 128 texels per metre with 4 m tiles', () => {
    expect(TILE_M).toBe(4);
    expect(GROUND_TEXELS_PER_M).toBeGreaterThanOrEqual(128);
  });

  it('grades lights off darker and redder than lights on', () => {
    const [r, g, b] = groundTint(0);
    expect([r, g, b]).toEqual([...GROUND_TINT_OFF]);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
    expect(r).toBeLessThan(GROUND_TINT_ON[0]);
    expect(g).toBeLessThan(GROUND_TINT_ON[1]);
    expect(groundTint(1)).toEqual([...GROUND_TINT_ON]);
  });

  it('clamps and tolerates bad blend values', () => {
    expect(groundTint(-3)).toEqual(groundTint(0));
    expect(groundTint(9)).toEqual(groundTint(1));
    expect(groundTint(Number.NaN)).toEqual(groundTint(0));
  });
});
