// Shared per-frame state for SceneLights, Sky and GroundFog (design Section 7).
// Plain mutable refs: nothing here goes through the store, so no React updates per frame.
import { Color, FogExp2 } from 'three';
import type { Scene } from 'three';
import {
  mix,
  mixHex,
  mixVec3,
  sceneParams,
  type CameraFogState,
  type FogLayerParams,
  type SceneParams,
} from '../model/sceneParams';
import { LOOK_STONE_COLOR_FACTOR } from '../look';

/** Eased lights value: 0 = lights off, 1 = lights on. */
export const lightsBlendRef: { current: number } = { current: 0 };

/** The camera rig publishes here every frame (11.10). Null until the rig exists. */
export const cameraFogRef: { current: CameraFogState | null } = { current: null };

/** Latest blended parameters, written by SceneLights, read by GroundFog and Sky. */
export const blendedParamsRef: { current: SceneParams | null } = { current: null };

/** Time constant of the lights ease: settles (99%) in about 0.46 s. */
export const LIGHTS_EASE_RATE = 10;

/** One eased step toward `target`, frame-rate independent. */
export function easeStep(current: number, target: number, dt: number): number {
  const next = current + (target - current) * (1 - Math.exp(-dt * LIGHTS_EASE_RATE));
  return Math.abs(target - next) < 1e-3 ? target : next;
}

/** Exact at both ends: lb = 0 gives the lights-off values, lb = 1 the lights-on values (23.16). */
const lerp = mix;

/**
 * Blends the lights-off and lights-on parameters with the eased value `lb`.
 * The camera term is inside `sceneParams` and is not eased (7.15). The lights-off side carries the
 * Batch 2b framed-plot look (Plot_Fog `#0a0d13` 0.075, hemisphere, environment 0, moon), already
 * interpolated from the overview with the camera move progress (23.4 to 23.8, 23.18); colours and
 * the moon offset are blended with `lb` too, because they now differ between the two modes.
 */
export function blendParams(
  lb: number,
  delta: number,
  cam: CameraFogState,
  overviewDistance?: number,
  off: SceneParams = sceneParams('off', delta, cam, overviewDistance),
  on: SceneParams = sceneParams('on', delta, cam, overviewDistance),
): SceneParams {
  const layer = (i: 0 | 1 | 2): FogLayerParams => ({
    y: off.fogLayers[i].y,
    opacity: lerp(off.fogLayers[i].opacity, on.fogLayers[i].opacity, lb),
  });
  return {
    fogColor: mixHex(off.fogColor, on.fogColor, lb),
    fogDensity: lerp(off.fogDensity, on.fogDensity, lb),
    plotLook: lerp(off.plotLook, on.plotLook, lb),
    groundFogFactor: off.groundFogFactor,
    stoneLift: off.stoneLift,
    // 0.55 in lights off, 1 in lights on, eased with the lights value (23.14, 23.16).
    stoneColorFactor: lerp(off.stoneColorFactor, on.stoneColorFactor, lb),
    backgroundIntensity: lerp(off.backgroundIntensity, on.backgroundIntensity, lb),
    envIntensity: lerp(off.envIntensity, on.envIntensity, lb),
    moon: {
      color: mixHex(off.moon.color, on.moon.color, lb),
      position: mixVec3(off.moon.position, on.moon.position, lb),
      intensity: lerp(off.moon.intensity, on.moon.intensity, lb),
    },
    hemi: {
      skyColor: mixHex(off.hemi.skyColor, on.hemi.skyColor, lb),
      groundColor: mixHex(off.hemi.groundColor, on.hemi.groundColor, lb),
      intensity: lerp(off.hemi.intensity, on.hemi.intensity, lb),
    },
    fogLayerColor: off.fogLayerColor,
    fogLayers: [layer(0), layer(1), layer(2)],
  };
}

/**
 * Headstone base-colour factor for this frame (23.14): the published blended value, or, before
 * SceneLights has published, the same blend from the eased lights value (0 = off = 0.55).
 */
export function stoneColorFactor(
  p: SceneParams | null,
  lb: number = lightsBlendRef.current,
): number {
  return p ? p.stoneColorFactor : lerp(LOOK_STONE_COLOR_FACTOR, 1, lb);
}

/** Publishes this frame's eased value and blended parameters for the other scene components. */
export function publishBlend(lb: number, p: SceneParams): void {
  lightsBlendRef.current = lb;
  blendedParamsRef.current = p;
}

/**
 * Writes the blended values onto the scene: FogExp2 colour and density (the colour changes to the
 * Plot_Fog `#0a0d13` in lights-off framed plots, 23.4) and the two HDRI intensities (environment 0
 * in lights-off framed plots, 23.7). The hemisphere, the moon and the sky dome read `p` themselves.
 */
export function applyToScene(scene: Scene, p: SceneParams): void {
  if (scene.fog instanceof FogExp2) {
    scene.fog.density = p.fogDensity;
    scene.fog.color.set(p.fogColor);
  }
  scene.backgroundIntensity = p.backgroundIntensity;
  scene.environmentIntensity = p.envIntensity;
  // Lights-off framed plot (23.5): the background is the fog colour. The sky dome draws over it and
  // fades to the same colour with plotLook; the overview and lights on keep no background colour.
  if (p.plotLook > 0) {
    if (!(scene.background instanceof Color)) scene.background = new Color();
    scene.background.set(p.fogColor);
  } else if (scene.background instanceof Color) {
    scene.background = null;
  }
}

/** Camera fog state when no rig has published one: at rest on the framed plot or overview. */
/**
 * Distance from the camera to the far edge of what it sees on the ground: the top view ray, at
 * (pitch - half the vertical FOV) below horizontal, meets the ground at height / sin(angle). Capped
 * so a flat view does not give an infinite distance. Used to scale the overview fog.
 */
export function cameraFarEdgeDistance(
  pos: readonly number[],
  look: readonly number[],
  fovDeg: number,
  maxDistance: number,
): number {
  const horizontal = Math.hypot(pos[0]! - look[0]!, pos[2]! - look[2]!);
  const pitch = Math.atan2(pos[1]! - look[1]!, horizontal);
  const angle = pitch - (fovDeg * Math.PI) / 360;
  if (!(angle > 0.05) || !(pos[1]! > 0)) return maxDistance;
  return Math.min(maxDistance, pos[1]! / Math.sin(angle));
}
export function defaultCameraFog(framed: number | 'overview'): CameraFogState {
  return { from: framed, to: framed, progress: 1 };
}
