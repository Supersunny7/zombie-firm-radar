import { describe, expect, it } from 'vitest';
import {
  FOG_DISTANCE_M,
  GROUND_NEAREST_EDGE_M,
  GROUND_SIZE_M,
  OVERVIEW_LIFT,
  plotFogWeight,
  sceneParams,
  type CameraFogState,
} from './sceneParams';

const overview: CameraFogState = { from: 'overview', to: 'overview', progress: 1 };
const plot: CameraFogState = { from: 2, to: 2, progress: 1 };

describe('plotFogWeight', () => {
  it('follows the move direction', () => {
    expect(plotFogWeight(overview)).toBe(0);
    expect(plotFogWeight({ from: 'overview', to: 3, progress: 0.25 })).toBe(0.25);
    expect(plotFogWeight({ from: 3, to: 'overview', progress: 0.25 })).toBe(0.75);
    expect(plotFogWeight({ from: 1, to: 4, progress: 0 })).toBe(1);
    expect(plotFogWeight({ from: 1, to: 1, progress: 0.5 })).toBe(1);
  });
  it('reaches final values at progress 1', () => {
    expect(plotFogWeight({ from: 'overview', to: 0, progress: 1 })).toBe(1);
    expect(plotFogWeight({ from: 0, to: 'overview', progress: 1 })).toBe(0);
  });
});

describe('sceneParams', () => {
  it('uses the overview values', () => {
    const off = sceneParams('off', 0, overview);
    const on = sceneParams('on', 0, overview);
    expect(off.fogDensity).toBe(0.02);
    expect(on.fogDensity).toBe(0.015);
    expect(off.fogColor).toBe('#171b21');
    expect(off.groundFogFactor).toBe(0.5);
    expect(off.fogLayers.map((l) => l.opacity)).toEqual([0.21, 0.13, 0.06]);
    expect(on.fogLayers.map((l) => l.opacity)).toEqual([0.13, 0.08, 0.04]);
  });

  it('uses the plot values and layer heights', () => {
    const off = sceneParams('off', 0, plot);
    const on = sceneParams('on', 0, plot);
    expect(off.fogDensity).toBe(0.085);
    expect(on.fogDensity).toBe(0.05);
    expect(off.fogLayers.map((l) => l.y)).toEqual([0.1, 0.38, 0.8]);
    expect(off.fogLayers.map((l) => l.opacity)).toEqual([0.42, 0.26, 0.12]);
    expect(on.fogLayers.map((l) => l.opacity)).toEqual([0.26, 0.16, 0.08]);
  });

  it('scales layers by 1.5 at +5 pp', () => {
    const p = sceneParams('off', 0.05, plot);
    expect(p.fogLayers[0].opacity).toBeCloseTo(0.63, 12);
    expect(p.fogLayers[2].opacity).toBeCloseTo(0.18, 12);
  });

  it('interpolates density with move progress', () => {
    const p = sceneParams('off', 0, { from: 'overview', to: 1, progress: 0.5 });
    expect(p.fogDensity).toBeCloseTo(0.0525, 12);
    expect(p.groundFogFactor).toBe(0.75);
  });

  it('puts the moon behind the stones (negative z)', () => {
    expect(sceneParams('off', 0, overview).moon.position[2]).toBeLessThan(0);
  });

  it('scales overview fog to the camera distance and keeps plot values', () => {
    const o = sceneParams('off', 0, overview, 80);
    expect(o.fogDensity).toBeCloseTo(1.6 / 80, 12);
    expect(o.fogDensity * 80).toBeCloseTo(1.6, 12);
    // Layers follow the same scaling, never above the plot factor.
    expect(sceneParams('off', 0, overview, 20).groundFogFactor).toBe(1);
    expect(sceneParams('off', 0, overview, 80).groundFogFactor).toBeCloseTo(
      0.5 * (0.02 / 0.02),
      12,
    );
    expect(sceneParams('off', 0, plot, 80).fogDensity).toBe(0.085);
    expect(sceneParams('on', 0, plot, 80).fogLayers[0].opacity).toBe(0.26);
    // Continuous during a move: halfway is the mean of the overview and plot densities.
    const mid = sceneParams('off', 0, { from: 'overview', to: 1, progress: 0.5 }, 80);
    expect(mid.fogDensity).toBeCloseTo((1.6 / 80 + 0.085) / 2, 12);
  });

  it('has the lights colours and intensities', () => {
    const off = sceneParams('off', 0, plot);
    const on = sceneParams('on', 0, plot);
    expect([off.backgroundIntensity, on.backgroundIntensity]).toEqual([0.045, 0.12]);
    expect([off.envIntensity, on.envIntensity]).toEqual([0.1, 0.3]);
    expect([off.moon.intensity, on.moon.intensity]).toEqual([0.22, 0.7]);
    expect(off.moon.color).toBe('#6f90e0');
    expect(off.moon.position).toEqual([-8, 16, -26]);
    expect([off.hemi.intensity, on.hemi.intensity]).toEqual([0.03, 0.35]);
    expect(off.hemi.skyColor).toBe('#3a4a66');
    expect(off.hemi.groundColor).toBe('#0b0806');
    expect(off.fogLayerColor).toBe('#2b323c');
  });
});

describe('overview light lift', () => {
  it('uses the lifted levels in the overview and the plot levels at a plot', () => {
    for (const lights of ['off', 'on'] as const) {
      const o = sceneParams(lights, 0, overview);
      const p = sceneParams(lights, 0, plot);
      expect(o.moon.intensity).toBe(OVERVIEW_LIFT[lights].moon);
      expect(o.hemi.intensity).toBe(OVERVIEW_LIFT[lights].hemi);
      expect(o.envIntensity).toBe(OVERVIEW_LIFT[lights].env);
      expect(o.moon.intensity).toBeGreaterThan(p.moon.intensity);
      expect(o.hemi.intensity).toBeGreaterThan(p.hemi.intensity);
      expect(o.envIntensity).toBeGreaterThan(p.envIntensity);
      expect([o.stoneLift, p.stoneLift]).toEqual([1, 0]);
    }
  });

  it('blends with the camera move and is continuous', () => {
    const half = sceneParams('off', 0, { from: 'overview', to: 1, progress: 0.5 });
    const o = sceneParams('off', 0, overview);
    const p = sceneParams('off', 0, plot);
    expect(half.stoneLift).toBe(0.5);
    expect(half.moon.intensity).toBeCloseTo((o.moon.intensity + p.moon.intensity) / 2, 12);
  });
});

describe('ground distances', () => {
  it('keeps the nearest edge at least 1.5 times the fog distance', () => {
    expect(FOG_DISTANCE_M).toBeCloseTo(132, 9);
    expect(GROUND_SIZE_M).toBe(480);
    expect(GROUND_NEAREST_EDGE_M).toBe(240);
    expect(GROUND_NEAREST_EDGE_M).toBeGreaterThanOrEqual(1.5 * FOG_DISTANCE_M);
  });
});
