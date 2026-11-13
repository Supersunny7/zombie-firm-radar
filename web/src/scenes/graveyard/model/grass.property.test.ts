import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeLayout, type LayoutInput, type StoneLayout } from '../layout/layout';
import { PIT_R_MAX, footprintCorners } from '../layout/extents';
import { GRASS_CAP, GRASS_MAX_HEIGHT, GRASS_NEAR_RADIUS, placeGrass } from './grass';

const statuses = ['zombie', 'endangered', 'healthy', 'insufficient_data'] as const;
const sectors = ['Manufacturing', 'Services', 'Mining', 'Finance'] as const;

const firmsArb = fc
  .uniqueArray(
    fc.record({
      cik: fc.integer({ min: 0, max: 9_999_999_999 }),
      sector: fc.constantFrom(...sectors),
      status: fc.constantFrom(...statuses),
      debt: fc.option(fc.integer({ min: 1, max: 1_000_000_000 }), { nil: null }),
    }),
    { minLength: 1, maxLength: 80, selector: (f) => f.cik },
  )
  .map((rows) =>
    rows.map((r): LayoutInput => ({
      cik: String(r.cik).padStart(10, '0'),
      sector: r.sector,
      status: r.status,
      total_debt_usd: r.debt,
    })),
  );

function insideQuad(x: number, z: number, q: readonly { x: number; z: number }[]): boolean {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i] as { x: number; z: number };
    const b = q[(i + 1) % 4] as { x: number; z: number };
    const cr = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if (cr > 0) pos++;
    else if (cr < 0) neg++;
  }
  return pos === 4 || neg === 4;
}

describe('grass properties', () => {
  // Feature: graveyard-horror-pass, Property 6: Grass respects clearance, cap, density and quality
  // **Validates: Requirements 6.5, 6.7, 6.8, 6.9**
  it('Property 6: height, cap, clearance, near-vs-far density and low-quality halving', () => {
    fc.assert(
      fc.property(firmsArb, (firms) => {
        const layout = computeLayout(firms);
        layout.plots.forEach((plot, pi) => {
          const normal = placeGrass(layout, pi, 'normal');
          const low = placeGrass(layout, pi, 'low');
          const stones = plot.stones.map((i) => layout.stones[i] as StoneLayout);

          // 6.7 cap, 6.9 low quality at most half, 6.5 height.
          expect(normal.length).toBeLessThanOrEqual(GRASS_CAP);
          expect(low.length).toBeLessThanOrEqual(normal.length / 2);
          for (const c of normal) expect(c.height).toBeLessThanOrEqual(GRASS_MAX_HEIGHT);

          // 6.8 no card inside a footprint or a Pit.
          for (const c of normal) {
            for (const s of stones) {
              expect(Math.hypot(c.x - s.pitCentre.x, c.z - s.pitCentre.z)).toBeGreaterThan(
                PIT_R_MAX,
              );
              expect(insideQuad(c.x, c.z, footprintCorners(s))).toBe(false);
            }
          }

          // 6.7 density near mounds exceeds density far from every mound (grid-estimated areas,
          // restricted to the plot rectangle).
          const { x0, z0, x1, z1 } = plot.rect;
          const step = 0.25;
          let nearArea = 0;
          let farArea = 0;
          for (let x = x0 + step / 2; x < x1; x += step) {
            for (let z = z0 + step / 2; z < z1; z += step) {
              let d = Infinity;
              for (const s of stones)
                d = Math.min(d, Math.hypot(x - s.pitCentre.x, z - s.pitCentre.z));
              if (d <= GRASS_NEAR_RADIUS) nearArea += step * step;
              else if (d > 3.0) farArea += step * step;
            }
          }
          if (nearArea < 1 || farArea < 4) return; // not enough area to compare
          let near = 0;
          let far = 0;
          for (const c of normal) {
            if (c.x < x0 || c.x > x1 || c.z < z0 || c.z > z1) continue;
            let d = Infinity;
            for (const s of stones)
              d = Math.min(d, Math.hypot(c.x - s.pitCentre.x, c.z - s.pitCentre.z));
            if (d <= GRASS_NEAR_RADIUS) near++;
            else if (d > 3.0) far++;
          }
          expect(near / nearArea).toBeGreaterThan(far / farArea);
        });
      }),
      { numRuns: 100 },
    );
  });

  it('returns [] for an unknown plot index', () => {
    const layout = computeLayout([
      { cik: '0000000001', sector: 'Services', status: 'zombie', total_debt_usd: 1 },
    ]);
    expect(placeGrass(layout, 5, 'normal')).toEqual([]);
  });
});
