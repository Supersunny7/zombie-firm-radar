// Shared per-frame state for SceneLights, Sky and GroundFog (design Section 7).
// Plain mutable refs: nothing here goes through the store, so no React updates per frame.
import { FogExp2 } from 'three';
import type { Scene } from 'three';
import {
  sceneParams,
  type CameraFogState,
  type FogLayerParams,
  type SceneParams,
} from '../model/sceneParams';

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

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Blends the lights-off and lights-on parameters with the eased value `lb`.
 * The camera term is inside `sceneParams` and is not eased (7.15).
 */
export function blendParams(
  lb: number,
  delta: number,
  cam: CameraFogState,
  off: SceneParams = sceneParams('off', delta, cam),
  on: SceneParams = sceneParams('on', delta, cam),
): SceneParams {
  const layer = (i: 0 | 1 | 2): FogLayerParams => ({
    y: off.fogLayers[i].y,
    opacity: lerp(off.fogLayers[i].opacity, on.fogLayers[i].opacity, lb),
  });
  return {
    fogColor: off.fogColor,
    fogDensity: lerp(off.fogDensity, on.fogDensity, lb),
    groundFogFactor: off.groundFogFactor,
    backgroundIntensity: lerp(off.backgroundIntensity, on.backgroundIntensity, lb),
    envIntensity: lerp(off.envIntensity, on.envIntensity, lb),
    moon: {
      color: off.moon.color,
      position: off.moon.position,
      intensity: lerp(off.moon.intensity, on.moon.intensity, lb),
    },
    hemi: {
      skyColor: off.hemi.skyColor,
      groundColor: off.hemi.groundColor,
      intensity: lerp(off.hemi.intensity, on.hemi.intensity, lb),
    },
    fogLayerColor: off.fogLayerColor,
    fogLayers: [layer(0), layer(1), layer(2)],
  };
}

/** Publishes this frame's eased value and blended parameters for the other scene components. */
export function publishBlend(lb: number, p: SceneParams): void {
  lightsBlendRef.current = lb;
  blendedParamsRef.current = p;
}

/** Writes the blended values onto the scene (fog density and the two HDRI intensities). */
export function applyToScene(scene: Scene, p: SceneParams): void {
  if (scene.fog instanceof FogExp2) scene.fog.density = p.fogDensity;
  scene.backgroundIntensity = p.backgroundIntensity;
  scene.environmentIntensity = p.envIntensity;
}

/** Camera fog state when no rig has published one: at rest on the framed plot or overview. */
export function defaultCameraFog(framed: number | 'overview'): CameraFogState {
  return { from: framed, to: framed, progress: 1 };
}
