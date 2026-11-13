import { describe, expect, it } from 'vitest';
import {
  FOG_DISTANCE_M,
  GROUND_NEAREST_EDGE_M,
  GROUND_SIZE_M,
  mixHex,
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

describe('mixHex', () => {
  it('returns the exact end colours and rounds per channel in between', () => {
    expect(mixHex('#171b21', '#0a0d13', 0)).toBe('#171b21');
    expect(mixHex('#171b21', '#0a0d13', 1)).toBe('#0a0d13');
    // 0x17 -> 0x0a: 23 -> 10, half is 16.5 -> 17 (0x11); 27 -> 13: 20 (0x14); 33 -> 19: 26 (0x1a).
    expect(mixHex('#171b21', '#0a0d13', 0.5)).toBe('#11141a');
  });
});

describe('sceneParams', () => {
  it('uses the Base_Spec overview values in both modes (23.18)', () => {
    const off = sceneParams('off', 0, overview);
    const on = sceneParams('on', 0, overview);
    expect(off.fogDensity).toBe(0.02);
    expect(on.fogDensity).toBe(0.015);
    expect(off.fogColor).toBe('#171b21');
    expect(off.plotLook).toBe(0);
    expect(off.moon.color).toBe('#6f90e0');
    expect(off.moon.position).toEqual([-8, 16, -26]);
    expect(off.hemi.skyColor).toBe('#3a4a66');
    expect(off.hemi.groundColor).toBe('#0b0806');
    expect(off.groundFogFactor).toBe(0.5);
    expect(off.fogLayers.map((l) => l.opacity)).toEqual([0.21, 0.13, 0.06]);
    expect(on.fogLayers.map((l) => l.opacity)).toEqual([0.13, 0.08, 0.04]);
  });

  it('uses the Plot_Fog values and layer heights (23.4, 23.5)', () => {
    const off = sceneParams('off', 0, plot);
    const on = sceneParams('on', 0, plot);
    expect(off.fogDensity).toBe(0.075);
    expect(off.fogColor).toBe('#0a0d13');
    expect(off.plotLook).toBe(1);
    expect(on.fogDensity).toBe(0.05);
    expect(on.fogColor).toBe('#171b21');
    expect(on.plotLook).toBe(0);
    expect(off.fogLayers.map((l) => l.y)).toEqual([0.1, 0.38, 0.8]);
    expect(off.fogLayers.map((l) => l.opacity)).toEqual([0.42, 0.26, 0.12]);
    expect(on.fogLayers.map((l) => l.opacity)).toEqual([0.26, 0.16, 0.08]);
  });

  it('scales layers by 1.5 at +5 pp', () => {
    const p = sceneParams('off', 0.05, plot);
    expect(p.fogLayers[0].opacity).toBeCloseTo(0.63, 12);
    expect(p.fogLayers[2].opacity).toBeCloseTo(0.18, 12);
  });

  it('interpolates the fog and the look with move progress (23.6)', () => {
    const p = sceneParams('off', 0, { from: 'overview', to: 1, progress: 0.5 });
    expect(p.fogDensity).toBeCloseTo((0.02 + 0.075) / 2, 12);
    expect(p.fogColor).toBe('#11141a');
    expect(p.plotLook).toBe(0.5);
    expect(p.moon.position).toEqual([-6, 12.5, -24]);
    expect(p.groundFogFactor).toBe(0.75);
    // Exact plot and overview values when the move ends, in both directions.
    const inDone = sceneParams('off', 0, { from: 'overview', to: 1, progress: 1 });
    const outDone = sceneParams('off', 0, { from: 1, to: 'overview', progress: 1 });
    expect(inDone).toEqual(sceneParams('off', 0, plot));
    expect(outDone).toEqual(sceneParams('off', 0, overview));
  });

  it('puts the moon behind the stones (negative z)', () => {
    expect(sceneParams('off', 0, overview).moon.position[2]).toBeLessThan(0);
    expect(sceneParams('off', 0, plot).moon.position[2]).toBeLessThan(0);
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
    expect(sceneParams('off', 0, plot, 80).fogDensity).toBe(0.075);
    expect(sceneParams('on', 0, plot, 80).fogLayers[0].opacity).toBe(0.26);
    // Continuous during a move: halfway is the mean of the overview and plot densities.
    const mid = sceneParams('off', 0, { from: 'overview', to: 1, progress: 0.5 }, 80);
    expect(mid.fogDensity).toBeCloseTo((1.6 / 80 + 0.075) / 2, 12);
  });

  it('has the lights-off framed-plot look values (23.7, 23.8)', () => {
    const off = sceneParams('off', 0, plot);
    expect(off.backgroundIntensity).toBe(0.045);
    expect(off.envIntensity).toBe(0);
    expect(off.hemi).toEqual({ skyColor: '#3a4a66', groundColor: '#0a0806', intensity: 0.18 });
    expect(off.moon).toEqual({ color: '#7f9cd6', position: [-4, 9, -22], intensity: 1.1 });
    expect(off.fogLayerColor).toBe('#2b323c');
  });

  it('keeps the Base_Spec lights-on values at a plot (23.16)', () => {
    const on = sceneParams('on', 0, plot);
    expect(on.backgroundIntensity).toBe(0.12);
    expect(on.envIntensity).toBe(0.3);
    expect(on.hemi).toEqual({ skyColor: '#3a4a66', groundColor: '#0b0806', intensity: 0.35 });
    expect(on.moon).toEqual({ color: '#6f90e0', position: [-8, 16, -26], intensity: 0.7 });
    expect(on.fogLayerColor).toBe('#2b323c');
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
    expect(half.envIntensity).toBeCloseTo((o.envIntensity + p.envIntensity) / 2, 12);
    expect(half.hemi.intensity).toBeCloseTo((o.hemi.intensity + p.hemi.intensity) / 2, 12);
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
