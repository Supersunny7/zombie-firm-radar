import { describe, expect, it } from 'vitest';
import { Color, FogExp2, Scene } from 'three';
import { sceneParams } from '../model/sceneParams';
import { LOOK_STONE_COLOR_FACTOR } from '../look';
import { applyToScene, blendParams, cameraFarEdgeDistance, stoneColorFactor } from './lightsBlend';

const overview = { from: 'overview', to: 'overview', progress: 1 } as const;
const plot = { from: 1, to: 1, progress: 1 } as const;

describe('cameraFarEdgeDistance', () => {
  it('measures the top view ray to the ground for the 60 degree overview', () => {
    // Height 93.3 at 60 degrees pitch, FOV 52: top ray 34 degrees down, 93.3 / sin(34 deg).
    const h = 93.3;
    const pos = [0, h, h / Math.tan(Math.PI / 3)];
    const d = cameraFarEdgeDistance(pos, [0, 0, 0], 52, 360);
    expect(d).toBeCloseTo(h / Math.sin(((60 - 26) * Math.PI) / 180), 6);
  });
  it('caps a flat plot view at the max distance', () => {
    expect(cameraFarEdgeDistance([0, 1.5, 5.6], [0, 0.2, -2], 52, 360)).toBe(360);
  });
});

describe('blendParams with overview distance', () => {
  it('passes the distance to the overview fog and leaves the plot fog alone', () => {
    expect(blendParams(0, 0, overview, 160).fogDensity).toBeCloseTo(0.01, 12);
    expect(blendParams(0, 0, plot, 160).fogDensity).toBe(0.075);
    expect(blendParams(1, 0, plot, 160).fogDensity).toBe(0.05);
  });
});

describe('blendParams framed-plot look', () => {
  it('gives the exact lights-off Plot_Fog, background, hemisphere, environment and moon (23.4 to 23.8)', () => {
    const p = blendParams(0, 0, plot, 160);
    expect(p.fogColor).toBe('#0a0d13');
    expect(p.fogDensity).toBe(0.075);
    expect(p.plotLook).toBe(1);
    expect(p.envIntensity).toBe(0);
    expect(p.hemi).toEqual({ skyColor: '#3a4a66', groundColor: '#0a0806', intensity: 0.18 });
    expect(p.moon).toEqual({ color: '#7f9cd6', position: [-4, 9, -22], intensity: 1.1 });
  });

  it('keeps the lights-off overview values (23.18)', () => {
    const p = blendParams(0, 0, overview, 160);
    expect(p).toEqual(sceneParams('off', 0, overview, 160));
    expect(p.fogColor).toBe('#171b21');
    expect(p.plotLook).toBe(0);
    expect(p.moon.color).toBe('#6f90e0');
    expect(p.moon.position).toEqual([-8, 16, -26]);
  });

  it('leaves lights on unchanged (23.16)', () => {
    expect(blendParams(1, 0.02, plot, 160)).toEqual(sceneParams('on', 0.02, plot, 160));
    // Overview: every light and fog value is the lights-on one (groundFogFactor is not blended;
    // the layer opacities that GroundFog reads are).
    const o = blendParams(1, 0.02, overview, 160);
    const e = sceneParams('on', 0.02, overview, 160);
    expect({ ...o, groundFogFactor: 0 }).toEqual({ ...e, groundFogFactor: 0 });
    const p = blendParams(1, 0, plot, 160);
    expect(p.fogColor).toBe('#171b21');
    expect(p.plotLook).toBe(0);
    expect(p.envIntensity).toBe(0.3);
  });

  it('reaches the plot values when the camera move ends and blends during it (23.6)', () => {
    const mid = blendParams(0, 0, { from: 'overview', to: 1, progress: 0.5 }, 160);
    expect(mid.plotLook).toBe(0.5);
    expect(mid.fogDensity).toBeCloseTo((1.6 / 160 + 0.075) / 2, 12);
    const end = blendParams(0, 0, { from: 'overview', to: 1, progress: 1 }, 160);
    expect(end).toEqual(blendParams(0, 0, plot, 160));
  });
});

describe('stone colour factor (23.14, 23.16, 23.18)', () => {
  it('is 0.55 in lights off, in a framed plot and in the overview, with the lift unchanged', () => {
    for (const cam of [plot, overview]) {
      const p = blendParams(0, 0, cam, 160);
      expect(p.stoneColorFactor).toBe(LOOK_STONE_COLOR_FACTOR);
      expect(p.stoneColorFactor).toBe(0.55);
      expect(stoneColorFactor(p)).toBe(0.55);
    }
    expect(blendParams(0, 0, overview, 160).stoneLift).toBe(1);
    expect(blendParams(0, 0, plot, 160).stoneLift).toBe(0);
  });

  it('is 1 in lights on and eases between the modes', () => {
    for (const cam of [plot, overview]) {
      expect(blendParams(1, 0, cam, 160).stoneColorFactor).toBe(1);
    }
    expect(blendParams(0.5, 0, plot, 160).stoneColorFactor).toBeCloseTo(0.775, 12);
  });

  it('falls back to the eased lights value before SceneLights publishes', () => {
    expect(stoneColorFactor(null, 0)).toBe(0.55);
    expect(stoneColorFactor(null, 1)).toBe(1);
  });
});

describe('applyToScene', () => {
  it('writes the fog colour and density and the environment intensity', () => {
    const scene = new Scene();
    scene.fog = new FogExp2('#171b21', 0.02);
    applyToScene(scene, blendParams(0, 0, plot, 160));
    const fog = scene.fog as FogExp2;
    expect(fog.color.getHexString()).toBe('0a0d13');
    expect(fog.density).toBe(0.075);
    expect(scene.environmentIntensity).toBe(0);
  });

  it('sets the background to the fog colour only in a lights-off framed plot (23.5, 23.16, 23.18)', () => {
    const scene = new Scene();
    scene.fog = new FogExp2('#171b21', 0.02);
    applyToScene(scene, blendParams(0, 0, plot, 160));
    expect(scene.background instanceof Color && scene.background.getHexString()).toBe('0a0d13');
    applyToScene(scene, blendParams(0, 0, overview, 160));
    expect(scene.background).toBe(null);
    applyToScene(scene, blendParams(0, 0, plot, 160));
    applyToScene(scene, blendParams(1, 0, plot, 160));
    expect(scene.background).toBe(null);
  });
});
