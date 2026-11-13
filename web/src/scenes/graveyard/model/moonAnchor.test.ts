import { describe, expect, it } from 'vitest';
import { LOOK_MOON } from '../look';
import { framedPlotCentre, moonAnchor, rectCentre, type GroundPoint } from './moonAnchor';
import { sceneParams } from './sceneParams';

const centres: Record<number, GroundPoint> = { 0: { x: 0, z: -2 }, 1: { x: 20, z: -12 } };
const centreOf = (i: number): GroundPoint | null => centres[i] ?? null;

describe('rectCentre', () => {
  it('is the middle of the plot rectangle', () => {
    expect(rectCentre({ x0: -3, z0: -10, x1: 5, z1: 2 })).toEqual({ x: 1, z: -4 });
  });
});

describe('framedPlotCentre', () => {
  it('is the framed plot centre at rest and null in the overview', () => {
    expect(framedPlotCentre({ from: 1, to: 1, progress: 1 }, centreOf)).toEqual(centres[1]);
    expect(framedPlotCentre({ from: 'overview', to: 'overview', progress: 1 }, centreOf)).toBe(
      null,
    );
  });

  it('is the plot end of a move to or from the overview', () => {
    expect(framedPlotCentre({ from: 'overview', to: 0, progress: 0.3 }, centreOf)).toEqual(
      centres[0],
    );
    expect(framedPlotCentre({ from: 1, to: 'overview', progress: 0.3 }, centreOf)).toEqual(
      centres[1],
    );
  });

  it('slides between two plots with the move progress', () => {
    expect(framedPlotCentre({ from: 0, to: 1, progress: 0.5 }, centreOf)).toEqual({
      x: 10,
      z: -7,
    });
  });

  it('falls back to the plot that exists', () => {
    expect(framedPlotCentre({ from: 7, to: 1, progress: 0.5 }, centreOf)).toEqual(centres[1]);
    expect(framedPlotCentre({ from: 7, to: 7, progress: 1 }, centreOf)).toBe(null);
  });
});

describe('moonAnchor (23.8, 23.18)', () => {
  const focus = { x: 4, z: 8 };
  const plot = { x: -6, z: -2 };

  it('is the camera focus at plotLook 0 or without a plot', () => {
    expect(moonAnchor(focus, plot, 0)).toBe(focus);
    expect(moonAnchor(focus, null, 1)).toBe(focus);
  });

  it('is the plot centre at plotLook 1 and linear in between', () => {
    expect(moonAnchor(focus, plot, 1)).toBe(plot);
    expect(moonAnchor(focus, plot, 0.5)).toEqual({ x: -1, z: 3 });
  });

  it('puts the lights-off framed moon at plot centre + (-4, 9, -22)', () => {
    const p = sceneParams('off', 0, { from: 0, to: 0, progress: 1 });
    const a = moonAnchor(focus, plot, p.plotLook);
    const [mx, my, mz] = p.moon.position;
    expect([a.x + mx, my, a.z + mz]).toEqual([
      plot.x + LOOK_MOON.offset[0],
      LOOK_MOON.offset[1],
      plot.z + LOOK_MOON.offset[2],
    ]);
  });
});
