import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeLayout, type GraveyardLayout } from '../layout/layout';
import { firmsArb } from '../layout/testArb';
import { placeGrass } from './grass';

const RUNS = { numRuns: 100 };

function allGrass(layout: GraveyardLayout, quality: 'normal' | 'low') {
  return layout.plots.map((_, i) => placeGrass(layout, i, quality));
}

/** A layout holding only plot `p`, with its stones re-indexed; every other plot is gone. */
function isolate(layout: GraveyardLayout, p: number): GraveyardLayout {
  const plot = layout.plots[p]!;
  return {
    stones: plot.stones.map((i) => layout.stones[i]!),
    plots: [{ ...plot, index: 0, stones: plot.stones.map((_, k) => k) }],
    bounds: plot.rect,
  };
}

describe('grass determinism and plot locality', () => {
  // Feature: graveyard-horror-pass, Property 5: Grass placement is deterministic and local to its plot
  // **Validates: Requirements 6.6**
  it('gives bit-identical cards for the same firm list', () => {
    fc.assert(
      fc.property(
        firmsArb(),
        fc.constantFrom<'normal' | 'low'>('normal', 'low'),
        (firms, quality) => {
          const a = allGrass(computeLayout(firms), quality);
          const b = allGrass(computeLayout(firms.map((f) => ({ ...f }))), quality);
          expect(b).toEqual(a);
        },
      ),
      RUNS,
    );
  });

  // Feature: graveyard-horror-pass, Property 5: Grass placement is deterministic and local to its plot
  // **Validates: Requirements 6.6**
  it('does not change a plot cards when the other plots are removed', () => {
    fc.assert(
      fc.property(firmsArb(), fc.nat(), (firms, pick) => {
        const layout = computeLayout(firms);
        const p = pick % layout.plots.length;
        expect(placeGrass(isolate(layout, p), 0, 'normal')).toEqual(
          placeGrass(layout, p, 'normal'),
        );
      }),
      RUNS,
    );
  });

  // Feature: graveyard-horror-pass, Property 5: Grass placement is deterministic and local to its plot
  // **Validates: Requirements 6.6**
  it('keeps a plot cards when the other plots stones are replaced', () => {
    fc.assert(
      fc.property(firmsArb(), fc.nat(), (firms, pick) => {
        const layout = computeLayout(firms);
        if (layout.plots.length < 2) return;
        const p = pick % layout.plots.length;
        const plot = layout.plots[p]!;
        const own = new Set(plot.stones);
        // Shift every foreign stone far away; the plot's own stones stay put.
        const stones = layout.stones.map((s, i) =>
          own.has(i)
            ? s
            : {
                ...s,
                x: s.x + 1000,
                z: s.z + 1000,
                pitCentre: { x: s.pitCentre.x + 1000, z: s.pitCentre.z + 1000 },
              },
        );
        expect(placeGrass({ ...layout, stones }, p, 'normal')).toEqual(
          placeGrass(layout, p, 'normal'),
        );
      }),
      RUNS,
    );
  });
});
