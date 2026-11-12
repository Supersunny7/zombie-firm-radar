// Pure scene parameters for ground, sky, fog and lights (design Section 7, Decision 6).
// No react or three imports.

/** What the camera rig publishes every frame (11.10). */
export interface CameraFogState {
  readonly from: 'overview' | number;
  readonly to: 'overview' | number;
  readonly progress: number;
}

export type LightsMode = 'off' | 'on';

export interface FogLayerParams {
  readonly y: number;
  readonly opacity: number;
}

export interface SceneParams {
  readonly fogColor: string;
  readonly fogDensity: number;
  readonly groundFogFactor: number;
  readonly backgroundIntensity: number;
  readonly envIntensity: number;
  readonly moon: {
    readonly color: string;
    readonly position: readonly [number, number, number];
    readonly intensity: number;
  };
  readonly hemi: {
    readonly skyColor: string;
    readonly groundColor: string;
    readonly intensity: number;
  };
  readonly fogLayerColor: string;
  readonly fogLayers: readonly [FogLayerParams, FogLayerParams, FogLayerParams];
}

export const FOG_COLOR = '#171b21';
export const FOG_LAYER_COLOR = '#2b323c';
export const FLAT_GROUND_COLOR = '#0b0806';

/** Overview_Fog densities (7.14): lights off, lights on. */
export const OVERVIEW_FOG_DENSITY = { off: 0.02, on: 0.015 } as const;
/** Plot_Fog densities (7.3, 7.4): lights off, lights on. */
export const PLOT_FOG_DENSITY = { off: 0.085, on: 0.05 } as const;

/** Ground_Fog factor in the overview (7.14) and at Plot_Fog. */
export const OVERVIEW_GROUND_FOG_FACTOR = 0.5;
export const PLOT_GROUND_FOG_FACTOR = 1;

/** Base layer opacities (7.11). */
const FOG_LAYER_BASE = {
  off: [
    { y: 0.1, opacity: 0.42 },
    { y: 0.38, opacity: 0.26 },
    { y: 0.8, opacity: 0.12 },
  ],
  on: [
    { y: 0.1, opacity: 0.26 },
    { y: 0.38, opacity: 0.16 },
    { y: 0.8, opacity: 0.08 },
  ],
} as const;

/** Largest shock delta in decimal (5 percentage points). */
export const MAX_SHOCK_DELTA = 0.05;

/** FogExp2 reaches 98 percent at 1.98 / density (7.2). */
export const FOG_DISTANCE_FACTOR = 1.98;
/** Lowest density in use: Overview_Fog, lights on. */
export const LOWEST_FOG_DENSITY = OVERVIEW_FOG_DENSITY.on;
/** 1.98 / 0.015 = 132 m. */
export const FOG_DISTANCE_M = FOG_DISTANCE_FACTOR / LOWEST_FOG_DENSITY;
/** Ground plane side length in metres (7.1). */
export const GROUND_SIZE_M = 480;
/** Nearest ground edge from the camera in metres (half the ground, 7.2). */
export const GROUND_NEAREST_EDGE_M = GROUND_SIZE_M / 2;
/** Camera far plane (design Section 7). */
export const CAMERA_FAR = 360;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Weight of the full Plot_Fog: 0 = Overview_Fog, 1 = Plot_Fog (7.14, 7.15, 7.17). */
export function plotFogWeight(c: CameraFogState): number {
  const fromOverview = c.from === 'overview';
  const toOverview = c.to === 'overview';
  if (fromOverview && toOverview) return 0;
  if (!fromOverview && !toOverview) return 1;
  const p = clamp01(c.progress);
  return fromOverview ? p : 1 - p;
}

export function sceneParams(lights: LightsMode, delta: number, cam: CameraFogState): SceneParams {
  const w = plotFogWeight(cam);
  const groundFogFactor = lerp(OVERVIEW_GROUND_FOG_FACTOR, PLOT_GROUND_FOG_FACTOR, w);
  const shock = 1 + (0.5 * delta) / MAX_SHOCK_DELTA;
  const off = lights === 'off';
  const [l0, l1, l2] = FOG_LAYER_BASE[lights];
  const layer = (b: { readonly y: number; readonly opacity: number }): FogLayerParams => ({
    y: b.y,
    opacity: b.opacity * groundFogFactor * shock,
  });
  return {
    fogColor: FOG_COLOR,
    fogDensity: lerp(OVERVIEW_FOG_DENSITY[lights], PLOT_FOG_DENSITY[lights], w),
    groundFogFactor,
    backgroundIntensity: off ? 0.045 : 0.12,
    envIntensity: off ? 0.05 : 0.3,
    moon: {
      color: '#8ea9d6',
      position: [-14, 18, -22],
      intensity: off ? 0.12 : 0.7,
    },
    hemi: {
      skyColor: '#3a4a66',
      groundColor: '#0b0806',
      intensity: off ? 0.03 : 0.35,
    },
    fogLayerColor: FOG_LAYER_COLOR,
    fogLayers: [layer(l0), layer(l1), layer(l2)],
  };
}
