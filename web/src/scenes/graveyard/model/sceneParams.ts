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
  /** Overview-only blue-grey emissive lift on the stones, 0 at a plot, 1 in the overview. */
  readonly stoneLift: number;
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

/**
 * Overview light levels (moon, hemisphere, environment intensity). At 90 m a 1 m stone covers a
 * few pixels, so the plot levels leave the whole field at about 3 percent grey after ACES and the
 * vignette. Blended with the plot levels by the same plot/overview weight as the fog.
 */
export const OVERVIEW_LIFT = {
  off: { moon: 3, hemi: 1.5, env: 0.4 },
  on: { moon: 2.0, hemi: 0.8, env: 0.5 },
} as const;

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
/** Overview-to-plot blend that returns the plot value exactly at weight 1. */
const lift = (overview: number, plot: number, w: number): number =>
  w >= 1 ? plot : lerp(overview, plot, w);
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

/** Overview fog target: density * camera distance. At the far edge exp(-1.6^2) = 7.7 percent stays visible, so it is mostly but not fully fogged. */
export const OVERVIEW_FOG_DISTANCE_PRODUCT = 1.6;

/** Overview_Fog density for a camera at distance metres; the fixed 7.14 value when unknown. */
export function overviewFogDensity(lights: LightsMode, distance?: number): number {
  if (distance === undefined || !(distance > 0)) return OVERVIEW_FOG_DENSITY[lights];
  return OVERVIEW_FOG_DISTANCE_PRODUCT / distance;
}

/**
 * Overview Ground_Fog factor, scaled with the same density change as the fog (clamped to the
 * Plot_Fog factor so the layers never get denser than at a plot).
 */
function overviewGroundFogFactor(lights: LightsMode, distance?: number): number {
  const ratio = overviewFogDensity(lights, distance) / OVERVIEW_FOG_DENSITY[lights];
  return Math.min(PLOT_GROUND_FOG_FACTOR, OVERVIEW_GROUND_FOG_FACTOR * ratio);
}

/**
 * overviewDistance is the camera distance to the layout centre; it only changes the overview side
 * of the plot/overview interpolation, so plot values and the interpolation stay continuous.
 */
export function sceneParams(
  lights: LightsMode,
  delta: number,
  cam: CameraFogState,
  overviewDistance?: number,
): SceneParams {
  const w = plotFogWeight(cam);
  const groundFogFactor = lerp(
    overviewGroundFogFactor(lights, overviewDistance),
    PLOT_GROUND_FOG_FACTOR,
    w,
  );
  const shock = 1 + (0.5 * delta) / MAX_SHOCK_DELTA;
  const off = lights === 'off';
  const [l0, l1, l2] = FOG_LAYER_BASE[lights];
  const layer = (b: { readonly y: number; readonly opacity: number }): FogLayerParams => ({
    y: b.y,
    opacity: b.opacity * groundFogFactor * shock,
  });
  return {
    fogColor: FOG_COLOR,
    fogDensity: lerp(overviewFogDensity(lights, overviewDistance), PLOT_FOG_DENSITY[lights], w),
    groundFogFactor,
    stoneLift: 1 - w,
    backgroundIntensity: off ? 0.045 : 0.12,
    // Lights off env 0.1 and moon 0.22 are the user's tuning (task 13.4, reference
    // graveyard-rate-shock-3pp.png); scene-reference had 0.05 and 0.12. Those are the plot values;
    // the overview lifts them (OVERVIEW_LIFT) so the field reads as a dim moonlit plain.
    envIntensity: lift(OVERVIEW_LIFT[lights].env, off ? 0.1 : 0.3, w),
    moon: {
      // Cool blue (was #8ea9d6), placed behind the stones (negative z, camera looks toward -z)
      // so they get a rim light (was [-14, 18, -22]).
      color: '#6f90e0',
      position: [-8, 16, -26],
      intensity: lift(OVERVIEW_LIFT[lights].moon, off ? 0.22 : 0.7, w),
    },
    hemi: {
      skyColor: '#3a4a66',
      groundColor: '#0b0806',
      intensity: lift(OVERVIEW_LIFT[lights].hemi, off ? 0.03 : 0.35, w),
    },
    fogLayerColor: FOG_LAYER_COLOR,
    fogLayers: [layer(l0), layer(l1), layer(l2)],
  };
}
