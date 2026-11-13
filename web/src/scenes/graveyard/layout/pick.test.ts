import { describe, expect, it } from 'vitest';
import { buildGrid } from './grid';
import { computeLayout, stoneCentreY, type LayoutInput, type StoneLayout } from './layout';
import { pickStone, rayStoneT } from './pick';

const firms: LayoutInput[] = Array.from({ length: 40 }, (_, i) => ({
  cik: String(i).padStart(10, '0'),
  status: i % 4 === 0 ? 'zombie' : i % 4 === 1 ? 'endangered' : 'healthy',
  sector: 'Manufacturing',
  total_debt_usd: 1e6 * (i + 1),
}));

function stone(over: Partial<StoneLayout>): StoneLayout {
  return {
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    width: 1,
    height: 2,
    depth: 0.5,
    sink: 0.2,
    baseY: -0.2,
    fallen: false,
    ...over,
  } as StoneLayout;
}

describe('rayStoneT', () => {
  it('hits the front of an upright box at the expected parameter', () => {
    const s = stone({});
    const t = rayStoneT(s, { ox: 0, oy: 1, oz: 5, dx: 0, dy: 0, dz: -1 }, 60);
    expect(t).toBeCloseTo(5 - 0.25, 9);
  });

  it('uses the lean: a rolled stone misses a ray its upright box would hit', () => {
    const ray = { ox: -1.4, oy: 3.2, oz: 5, dx: 0, dy: 0, dz: -1 };
    expect(rayStoneT(stone({ height: 4 }), ray, 60)).toBeNull();
    // Roll about z by +0.5 rad moves the top to -x (top x = -h sin(roll)).
    expect(rayStoneT(stone({ height: 4, roll: 0.5 }), ray, 60)).not.toBeNull();
  });

  it('treats a fallen stone as a flat box lying with its face up', () => {
    const s = stone({ fallen: true, pitch: -Math.PI / 2, baseY: 0.25 - 0.2 });
    const down = { ox: 0, oy: 3, oz: -1, dx: 0, dy: -1, dz: 0 };
    expect(rayStoneT(s, down, 60)).toBeCloseTo(3 - (0.05 + 0.25), 9);
    // Beyond its length (2 m toward -z) there is nothing.
    expect(rayStoneT(s, { ...down, oz: -2.5 }, 60)).toBeNull();
    // A standing-height ray at z = 0.5 passes behind its base.
    expect(rayStoneT(s, { ox: 0, oy: 1, oz: 3, dx: 0, dy: 0, dz: -1 }, 60)).toBeNull();
  });
});

describe('pickStone with the grid', () => {
  it('hits every stone from a ray aimed at its centre', () => {
    const layout = computeLayout(firms);
    const grid = buildGrid(layout);
    for (const [i, s] of layout.stones.entries()) {
      const oy = stoneCentreY(s) + 0.01;
      const hit = pickStone(
        grid,
        layout,
        { ox: s.x, oy: oy + 6, oz: s.z, dx: 0, dy: -1, dz: 0 },
        60,
      );
      expect(hit?.stone).toBe(i);
    }
  });
});
