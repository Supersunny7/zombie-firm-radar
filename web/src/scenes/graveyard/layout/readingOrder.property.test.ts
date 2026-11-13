import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeLayout, type LayoutInput } from './layout';
import { nextFocus, type NavDir } from './nav';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const DIRS: NavDir[] = ['left', 'right', 'up', 'down'];
const VEC: Record<NavDir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

/** Same sectors, statuses and debts in the same order, but different ciks (so different jitter). */
function rekey(firms: readonly LayoutInput[], offset: number): LayoutInput[] {
  return firms.map((f, i) => ({
    ...f,
    cik: String(1_000_000 + offset * 100_000 + i).padStart(10, '0'),
  }));
}

// Feature: graveyard-horror-pass, Property 15: Reading order does not depend on jitter
// **Validates: Requirements 8.13, 8.14, 8.16**
describe('Property 15: Reading order does not depend on jitter', () => {
  it('plot.stones lists each plot firms in input order, whatever the jitter', () => {
    fc.assert(
      fc.property(firmsArb(60, 6), fc.integer({ min: 1, max: 8 }), (firms, offset) => {
        const layout = computeLayout(firms);
        const sectors = [...new Set(firms.map((f) => f.sector))].sort();
        expect(layout.plots.map((p) => p.sector)).toEqual(sectors);
        layout.plots.forEach((plot) => {
          const expected = firms.flatMap((f, i) => (f.sector === plot.sector ? [i] : []));
          expect(plot.stones).toEqual(expected);
          plot.stones.forEach((idx) => expect(layout.stones[idx]!.plot).toBe(plot.index));
        });

        // A completely different jitter leaves the reading order unchanged.
        const other = computeLayout(rekey(firms, offset));
        expect(other.plots.map((p) => p.stones)).toEqual(layout.plots.map((p) => p.stones));
      }),
      OPTS,
    );
  });

  it('nextFocus returns the nearest same-plot stone inside the 45 degree cone of jittered centres', () => {
    fc.assert(
      fc.property(firmsArb(40, 4), fc.constantFrom(...DIRS), (firms, dir) => {
        const layout = computeLayout(firms);
        const [dx, dz] = VEC[dir];
        layout.stones.forEach((from, current) => {
          const plot = layout.plots[from.plot]!;
          const cone = plot.stones.filter((idx) => {
            if (idx === current) return false;
            const s = layout.stones[idx]!;
            const vx = s.x - from.x;
            const vz = s.z - from.z;
            const along = vx * dx + vz * dz;
            const perp = Math.abs(vx * dz - vz * dx);
            return along > 0 && perp <= along;
          });
          const next = nextFocus(layout, from.plot, current, dir);
          if (cone.length === 0) {
            expect(next).toBeNull();
            return;
          }
          expect(next).not.toBeNull();
          expect(cone).toContain(next);
          const dist = (idx: number) =>
            Math.hypot(layout.stones[idx]!.x - from.x, layout.stones[idx]!.z - from.z);
          const best = Math.min(...cone.map(dist));
          expect(dist(next as number)).toBe(best);
        });
      }),
      OPTS,
    );
  });
});

// Example for 8.16: changing the jitter (ciks) moves the stones but not the keyboard order.
describe('Requirement 8.16: a jitter change leaves keyboard order unchanged', () => {
  it('keeps plot.stones while the jittered centres move', () => {
    const firms: LayoutInput[] = Array.from({ length: 7 }, (_, i) => ({
      cik: String(i + 1).padStart(10, '0'),
      sector: 'Manufacturing',
      status: 'healthy',
      total_debt_usd: 1e8,
    }));
    const a = computeLayout(firms);
    const b = computeLayout(
      firms.map((f, i) => ({ ...f, cik: String(500 + i).padStart(10, '0') })),
    );
    expect(a.plots[0]!.stones).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(b.plots[0]!.stones).toEqual(a.plots[0]!.stones);
    expect(b.stones.some((s, i) => s.x !== a.stones[i]!.x || s.z !== a.stones[i]!.z)).toBe(true);
  });
});
