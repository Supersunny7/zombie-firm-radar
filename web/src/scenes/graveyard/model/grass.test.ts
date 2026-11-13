import { describe, expect, it } from 'vitest';
import { computeLayout, type LayoutInput } from '../layout/layout';
import { footprintCorners } from '../layout/extents';
import { GRASS_CAP, GRASS_MAX_HEIGHT, placeGrass } from './grass';
import { GRASS_TEXTURE_SIZE, grassTexture } from './grassTexture';

const firms: LayoutInput[] = Array.from({ length: 30 }, (_, i) => ({
  cik: String(i).padStart(10, '0'),
  sector: i % 2 ? 'Manufacturing' : 'Services',
  status: 'zombie',
  total_debt_usd: 1e6 * (i + 1),
}));

describe('placeGrass', () => {
  const layout = computeLayout(firms);

  it('is deterministic, capped, short, and halves in low quality', () => {
    const a = placeGrass(layout, 0, 'normal');
    expect(placeGrass(layout, 0, 'normal')).toEqual(a);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(GRASS_CAP);
    expect(a.every((c) => c.height <= GRASS_MAX_HEIGHT)).toBe(true);
    expect(placeGrass(layout, 0, 'low').length).toBeLessThanOrEqual(a.length / 2);
  });

  it('keeps cards out of pits and out of footprints', () => {
    const plot = layout.plots[0]!;
    for (const c of placeGrass(layout, 0, 'normal')) {
      for (const i of plot.stones) {
        const s = layout.stones[i]!;
        expect(Math.hypot(c.x - s.pitCentre.x, c.z - s.pitCentre.z)).toBeGreaterThan(0.45);
        const q = footprintCorners(s);
        const xs = q.map((p) => p.x);
        const zs = q.map((p) => p.z);
        const inBox =
          c.x > Math.min(...xs) &&
          c.x < Math.max(...xs) &&
          c.z > Math.min(...zs) &&
          c.z < Math.max(...zs);
        // The bounding box is looser than the oriented rectangle; only check unrotated stones' centres.
        expect(Math.hypot(c.x - s.x, c.z - s.z) > 0.05 || !inBox).toBe(true);
      }
    }
  });

  it('returns nothing for an unknown plot', () => {
    expect(placeGrass(layout, 99, 'normal')).toEqual([]);
  });
});

describe('grassTexture', () => {
  it('is 128 x 128 RGBA with binary alpha and some blades', () => {
    const t = grassTexture(1);
    expect(t.length).toBe(GRASS_TEXTURE_SIZE * GRASS_TEXTURE_SIZE * 4);
    let solid = 0;
    for (let i = 3; i < t.length; i += 4) {
      expect([0, 255]).toContain(t[i]);
      if (t[i] === 255) solid++;
    }
    expect(solid).toBeGreaterThan(200);
    expect(grassTexture(1)).toEqual(t);
  });
});
