import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { footprintCorners } from './extents';
import {
  FIRST_ROW_Z,
  LEAN_ENDANGERED,
  LEAN_HEALTHY_MAX,
  MIN_GAP,
  computeLayout,
  stoneBaseY,
  stoneCentreY,
  type LayoutInput,
} from './layout';
import { firmsArb } from './testArb';

const OPTS = { numRuns: 100 };
const TILT_MAX = (8 * Math.PI) / 180;

function box(s: Parameters<typeof footprintCorners>[0]) {
  const c = footprintCorners(s);
  return {
    x0: Math.min(...c.map((p) => p.x)),
    x1: Math.max(...c.map((p) => p.x)),
    z0: Math.min(...c.map((p) => p.z)),
    z1: Math.max(...c.map((p) => p.z)),
  };
}

describe('computeLayout (band packing)', () => {
  it('is deterministic and keeps input-order plot.stones', () => {
    fc.assert(
      fc.property(firmsArb(), (firms) => {
        const a = computeLayout(firms);
        expect(computeLayout(firms)).toEqual(a);
        const seen = a.plots.flatMap((p) => [...p.stones]);
        expect(seen.length).toBe(firms.length);
        for (const p of a.plots) {
          expect([...p.stones]).toEqual([...p.stones].sort((x, y) => x - y));
        }
      }),
      OPTS,
    );
  });

  it('keeps footprints at least MIN_GAP apart', () => {
    fc.assert(
      fc.property(firmsArb(40), (firms) => {
        const layout = computeLayout(firms);
        const boxes = layout.stones.map(box);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!;
            const b = boxes[j]!;
            if (layout.stones[i]!.plot !== layout.stones[j]!.plot) continue;
            const gapX = Math.max(a.x0 - b.x1, b.x0 - a.x1);
            const gapZ = Math.max(a.z0 - b.z1, b.z0 - a.z1);
            expect(Math.max(gapX, gapZ)).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
          }
        }
      }),
      OPTS,
    );
  });

  it('tilts undead stones more than healthy ones, within 8 degrees', () => {
    fc.assert(
      fc.property(firmsArb(), (firms) => {
        const layout = computeLayout(firms);
        firms.forEach((f, i) => {
          const s = layout.stones[i]!;
          if (s.fallen) return;
          expect(s.lean).toBeLessThanOrEqual(TILT_MAX);
          if (f.status === 'healthy' || f.status === 'insufficient_data') {
            expect(s.lean).toBeLessThan(LEAN_HEALTHY_MAX);
          } else {
            expect(s.lean).toBeGreaterThanOrEqual(LEAN_ENDANGERED[0] - 1e-12);
          }
        });
      }),
      OPTS,
    );
  });

  it('lays fallen stones on their back, face up, base in [-0.08, depth/2]', () => {
    fc.assert(
      fc.property(firmsArb(), (firms) => {
        const layout = computeLayout(firms);
        for (const s of layout.stones) {
          expect(stoneBaseY(s)).toBe(s.baseY);
          if (!s.fallen) {
            expect(s.baseY).toBeCloseTo(-s.sink, 12);
            continue;
          }
          expect(s.pitch).toBeCloseTo(-Math.PI / 2, 12);
          expect(s.lean).toBe(0);
          expect(s.sink).toBeGreaterThanOrEqual(0);
          expect(s.sink).toBeLessThanOrEqual(0.08);
          expect(s.baseY).toBeCloseTo(s.depth / 2 - s.sink, 12);
          expect(stoneCentreY(s)).toBe(s.baseY);
          const side = Math.abs(s.yaw - s.standingYaw);
          expect(side).toBeCloseTo(Math.PI / 2, 9);
        }
      }),
      OPTS,
    );
  });

  it('puts row anchors front to back, the first at frontZ', () => {
    fc.assert(
      fc.property(firmsArb(), (firms) => {
        const layout = computeLayout(firms);
        for (const p of layout.plots) {
          expect(p.rowAnchors[0]).toBe(p.frontZ);
          for (let r = 1; r < p.rowAnchors.length; r++) {
            expect(p.rowAnchors[r]!).toBeLessThan(p.rowAnchors[r - 1]!);
          }
        }
        expect(layout.plots[0]!.frontZ).toBe(FIRST_ROW_Z);
      }),
      OPTS,
    );
  });
});

describe('keyboard order', () => {
  it('follows the input order of each plot, whatever the jitter', () => {
    const firms: LayoutInput[] = Array.from({ length: 12 }, (_, i) => ({
      cik: String(i).padStart(10, '0'),
      sector: 'A',
      status: 'healthy',
      total_debt_usd: 1e6,
    }));
    const a = computeLayout(firms);
    // A different cik changes that firm's jitter but not the reading order.
    const b = computeLayout(firms.map((f, i) => (i === 5 ? { ...f, cik: '0000099999' } : f)));
    expect([...a.plots[0]!.stones]).toEqual([...b.plots[0]!.stones]);
    expect([...a.plots[0]!.stones]).toEqual(firms.map((_, i) => i));
  });
});
