// Pure scene parameters for ground, sky, fog and lights (design Section 7, Decision 6).
// No react or three imports.
import {
  LOOK_BACKGROUND,
  LOOK_ENVIRONMENT_INTENSITY,
  LOOK_HEMISPHERE,
  LOOK_MOON,
  LOOK_PLOT_FOG,
  LOOK_STONE_COLOR_FACTOR,
} from '../look';

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
  /** FogExp2 colour; also the sky colour at the horizon and, in lights-off framed plots, the whole background (23.5). */
  readonly fogColor: string;
  readonly fogDensity: number;
  /**
   * Weight of the lights-off framed-plot look (Batch 2b, 23.4 to 23.8): 1 in a lights-off framed
   * plot, 0 in the overview and in lights on, the plot/overview move weight in between. Consumers
   * use it to replace the sky gradient by the flat fog colour (23.5) and to move the moon anchor
   * from the camera focus to the framed plot centre (23.8).
   */
  readonly plotLook: number;
  readonly groundFogFactor: number;
  /** Overview-only blue-grey emissive lift on the stones, 0 at a plot, 1 in the overview. */
  readonly stoneLift: number;
  /**
   * Multiplier on every Headstone base colour: LOOK_STONE_COLOR_FACTOR (0.55) in lights off, in the
   * overview and in framed plots alike, so the stones do not blow out in the Flashlight beam
   * (23.14); 1 in lights on (23.16). The emissive lift and the decay tint are separate.
   */
  readonly stoneColorFactor: number;
  readonly backgroundIntensity: number;
  readonly envIntensity: number;
  readonly moon: {
    readonly color: string;
    /**
     * Offset of the moon from its anchor: the snapped camera focus in the overview and lights on
     * (Base_Spec), the framed plot centre in lights-off framed plots (LOOK_MOON.offset, 23.8).
     */
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

/** Base_Spec fog colour: Overview_Fog in both modes and Plot_Fog in lights on. */
export const FOG_COLOR = '#171b21';
export const FOG_LAYER_COLOR = '#2b323c';
export const FLAT_GROUND_COLOR = '#0b0806';

/** Overview_Fog densities (7.14): lights off, lights on. */
export const OVERVIEW_FOG_DENSITY = { off: 0.02, on: 0.015 } as const;
/** Plot_Fog densities: lights off from look.ts (23.4, was 0.085), lights on Base_Spec 7.4. */
export const PLOT_FOG_DENSITY = { off: LOOK_PLOT_FOG.density, on: 0.05 } as const;

/** Base_Spec moon and hemisphere: overview in both modes, framed plots in lights on (23.16, 23.18). */
export const BASE_MOON = {
  color: '#6f90e0',
  position: [-8, 16, -26],
} as const;
export const BASE_HEMI = { skyColor: '#3a4a66', groundColor: '#0b0806' } as const;

/** Plot-level light intensities of the Base_Spec (task 2.27); lights off is replaced in plots by look.ts. */
const BASE_PLOT_LIGHTS = {
  off: { env: 0.2, moon: 0.5, hemi: 0.14 },
  on: { env: 0.3, moon: 0.7, hemi: 0.35 },
} as const;

/** Framed-plot light intensities: lights off from look.ts (23.7, 23.8), lights on Base_Spec. */
export const PLOT_LIGHTS = {
  off: {
    env: LOOK_ENVIRONMENT_INTENSITY,
    moon: LOOK_MOON.intensity,
    hemi: LOOK_HEMISPHERE.intensity,
  },
  on: BASE_PLOT_LIGHTS.on,
} as const;

/**
 * Overview light levels (moon, hemisphere, environment intensity). At 90 m a 1 m stone covers a
 * few pixels, so the plot levels leave the whole field at about 3 percent grey after ACES and the
 * vignette. Blended with the plot levels by the same plot/overview weight as the fog.
 */
export const OVERVIEW_LIFT = {
  off: { moon: 5, hemi: 3, env: 0.8 },
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
/** Linear blend that returns `a` exactly at t <= 0 and `b` exactly at t >= 1. */
export const mix = (a: number, b: number, t: number): number =>
  t <= 0 ? a : t >= 1 ? b : lerp(a, b, t);
/** Overview-to-plot blend that returns the plot value exactly at weight 1. */
const lift = mix;
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

const HEX_RE = /^#[0-9a-f]{6}$/i;
const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
const toHex2 = (v: number): string => Math.round(v).toString(16).padStart(2, '0');

/**
 * Blends two `#rrggbb` sRGB colours per channel, rounded to whole channel steps. Returns `a`
 * exactly at t <= 0 and `b` exactly at t >= 1, so end-of-move values are the exact look values.
 */
export function mixHex(a: string, b: string, t: number): string {
  if (t <= 0 || a === b) return a;
  if (t >= 1) return b;
  if (!HEX_RE.test(a) || !HEX_RE.test(b)) throw new Error(`mixHex expects #rrggbb: ${a}, ${b}`);
  return `#${[0, 1, 2].map((i) => toHex2(lerp(channel(a, i), channel(b, i), t))).join('')}`;
}

/** Blends two offsets per axis with exact endpoints. */
export function mixVec3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): readonly [number, number, number] {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

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
  // Batch 2b look weight: the prototype values apply only in lights-off framed plots (23.16, 23.18),
  // blended with the same move weight as the fog so they are exact when the move ends (23.6).
  const look = off ? w : 0;
  return {
    // Lights off: Overview_Fog colour to Plot_Fog colour (23.4); lights on keeps the Base_Spec colour.
    fogColor: mixHex(FOG_COLOR, LOOK_BACKGROUND, look),
    fogDensity: lift(overviewFogDensity(lights, overviewDistance), PLOT_FOG_DENSITY[lights], w),
    plotLook: look,
    groundFogFactor,
    stoneLift: 1 - w,
    stoneColorFactor: off ? LOOK_STONE_COLOR_FACTOR : 1,
    backgroundIntensity: off ? 0.045 : 0.12,
    // Plot levels: lights on keeps the Base_Spec env 0.3, moon 0.7, hemi 0.35 (task 2.27); lights
    // off uses look.ts (env 0, moon 1.1, hemi 0.18). The overview keeps OVERVIEW_LIFT so the field
    // reads as a dim moonlit plain (23.18).
    envIntensity: lift(OVERVIEW_LIFT[lights].env, PLOT_LIGHTS[lights].env, w),
    moon: {
      // Base_Spec: cool blue, behind the stones (negative z, camera looks toward -z) for rim light.
      color: mixHex(BASE_MOON.color, LOOK_MOON.color, look),
      position: mixVec3(BASE_MOON.position, LOOK_MOON.offset, look),
      intensity: lift(OVERVIEW_LIFT[lights].moon, PLOT_LIGHTS[lights].moon, w),
    },
    hemi: {
      skyColor: mixHex(BASE_HEMI.skyColor, LOOK_HEMISPHERE.skyColor, look),
      groundColor: mixHex(BASE_HEMI.groundColor, LOOK_HEMISPHERE.groundColor, look),
      intensity: lift(OVERVIEW_LIFT[lights].hemi, PLOT_LIGHTS[lights].hemi, w),
    },
    fogLayerColor: FOG_LAYER_COLOR,
    fogLayers: [layer(l0), layer(l1), layer(l2)],
  };
}
