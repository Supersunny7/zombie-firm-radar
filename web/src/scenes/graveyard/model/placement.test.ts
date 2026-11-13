import { describe, expect, it } from 'vitest';
import { computeLayout, type LayoutInput } from '../layout/layout';
import { coneCovers } from './coneCovers';
import { corpseAnchor, mutantPlacement, MUTANT_MIN_BEHIND } from './placement';

function firm(i: number, sector: string, status: LayoutInput['status']): LayoutInput {
  return { cik: String(9100000000 + i), sector, status, total_debt_usd: 1e6 * (i + 1) };
}

describe('mutantPlacement', () => {
  it('is at least 20 units behind the last row', () => {
    const firms = Array.from({ length: 40 }, (_, i) => firm(i, `S${i % 5}`, 'healthy'));
    const layout = computeLayout(firms);
    const m = mutantPlacement(layout);
    for (const s of layout.stones) expect(m.z).toBeLessThanOrEqual(s.z - MUTANT_MIN_BEHIND);
  });

  it('handles an empty layout', () => {
    const m = mutantPlacement(computeLayout([]));
    expect(Number.isFinite(m.z)).toBe(true);
  });
});

describe('corpseAnchor', () => {
  it('returns null when there is no zombie', () => {
    const layout = computeLayout([firm(0, 'A', 'healthy'), firm(1, 'A', 'endangered')]);
    expect(corpseAnchor(layout, () => false)).toBeNull();
  });

  it('picks the nearest zombie stone', () => {
    const layout = computeLayout(Array.from({ length: 12 }, (_, i) => firm(i, 'A', 'zombie')));
    const camera = { x: 0, y: 2.15, z: 9.4 };
    const got = corpseAnchor(layout, () => true);
    const dist = (i: number) => {
      const s = layout.stones[i]!;
      return Math.hypot(s.x - camera.x, camera.y, s.z - camera.z);
    };
    for (let i = 0; i < 12; i++) expect(dist(got!)).toBeLessThanOrEqual(dist(i));
  });

  it('breaks ties toward the lower index', () => {
    const layout = computeLayout([
      firm(0, 'A', 'zombie'),
      firm(1, 'A', 'zombie'),
      firm(2, 'A', 'zombie'),
    ]);
    const stones = layout.stones.map((s) => ({ ...s, x: 3, z: 5 }));
    const tied = { ...layout, stones };
    expect(corpseAnchor(tied, () => true)).toBe(0);
    expect(corpseAnchor(tied, (i) => i >= 1)).toBe(1);
  });
});

describe('coneCovers', () => {
  const o = { x: 0, y: 0, z: 0 };
  const d = { x: 0, y: 0, z: -1 };
  it('covers a sphere on the axis within range', () => {
    expect(coneCovers(o, d, 0.3, 50, { center: { x: 0, y: 0, z: -20 }, radius: 1 })).toBe(true);
  });
  it('rejects a sphere beyond range and one behind', () => {
    expect(coneCovers(o, d, 0.3, 10, { center: { x: 0, y: 0, z: -20 }, radius: 1 })).toBe(false);
    expect(coneCovers(o, d, 0.3, 50, { center: { x: 0, y: 0, z: 20 }, radius: 1 })).toBe(false);
  });
  it('counts a sphere that only grazes the cone edge', () => {
    // centre at 45 degrees off axis, distance 10, radius 3: asin(0.3) = 0.3047
    const c = { x: 10 * Math.sin(0.5), y: 0, z: -10 * Math.cos(0.5) };
    expect(coneCovers(o, d, 0.3, 50, { center: c, radius: 3 })).toBe(true);
    expect(coneCovers(o, d, 0.3, 50, { center: c, radius: 1 })).toBe(false);
  });
  it('covers when the origin is inside the sphere', () => {
    expect(coneCovers(o, d, 0.1, 5, { center: { x: 0, y: 0, z: 1 }, radius: 2 })).toBe(true);
  });
  it('uses the range against the nearest point of the sphere', () => {
    expect(coneCovers(o, d, 0.3, 19, { center: { x: 0, y: 0, z: -20 }, radius: 1 })).toBe(true);
    expect(coneCovers(o, d, 0.3, 18.9, { center: { x: 0, y: 0, z: -20 }, radius: 1 })).toBe(false);
  });
});
