// Mutable flashlight state written by Flashlight every frame (design Section 10).
// Read by the Mutant cone test (coneCovers, task 16.4); nothing here goes through the store.
import type { Ray } from '../layout/pick';

export const FLASHLIGHT_COLOR = '#fff1d6';
export const FLASHLIGHT_INTENSITY = 70;
export const FLASHLIGHT_DISTANCE = 28;
export const FLASHLIGHT_ANGLE = 0.27;
export const FLASHLIGHT_PENUMBRA = 0.85;
export const FLASHLIGHT_DECAY = 1.7;
export const FLASHLIGHT_SHADOW_MAP = 1024;
/** Offset from the camera in camera-local metres (10.2). */
export const FLASHLIGHT_OFFSET: readonly [number, number, number] = [0.28, -0.32, 0.1];
/** Aim used until a valid ray hit exists (10.4). */
export const FLASHLIGHT_FALLBACK_TARGET: readonly [number, number, number] = [0, 0.2, -2];
/** Aim damping (reaches 95% in about 0.25 s, inside the 300 ms keyboard budget of 18.6). */
export const AIM_LAMBDA = 12;
/** Farthest ground hit accepted as a valid target. */
export const MAX_AIM_T = 120;

export interface FlashlightState {
  /** World position of the light. */
  origin: [number, number, number];
  /** Unit vector from origin toward the aim point. */
  direction: [number, number, number];
  /** Half cone angle in radians. */
  halfAngle: number;
  /** Light range in metres (0 when inactive). */
  range: number;
  /** False in the overview, where the flashlight is off (moonlight and lantern only). */
  active: boolean;
}

export const flashlightStateRef: { current: FlashlightState } = {
  current: {
    origin: [0.28, 1.83, 9.5],
    direction: [0, -0.1, -1],
    halfAngle: FLASHLIGHT_ANGLE,
    range: FLASHLIGHT_DISTANCE,
    active: true,
  },
};

export function writeFlashlightState(
  origin: readonly [number, number, number],
  target: readonly [number, number, number],
  active = true,
): void {
  const s = flashlightStateRef.current;
  s.origin[0] = origin[0];
  s.origin[1] = origin[1];
  s.origin[2] = origin[2];
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const dz = target[2] - origin[2];
  const len = Math.hypot(dx, dy, dz);
  if (len > 1e-9) {
    s.direction[0] = dx / len;
    s.direction[1] = dy / len;
    s.direction[2] = dz / len;
  }
  s.halfAngle = FLASHLIGHT_ANGLE;
  s.range = active ? FLASHLIGHT_DISTANCE : 0;
  s.active = active;
}

/**
 * Nearest valid surface point on a ray: the nearer of the stone hit (`stoneT`) and the ground
 * plane y = 0. Returns null when neither exists (ray points at or above the horizon over no stone).
 */
export function aimPoint(ray: Ray, stoneT: number | null): [number, number, number] | null {
  let t: number | null = stoneT;
  if (ray.dy < 0 && ray.oy > 0) {
    const tg = -ray.oy / ray.dy;
    if (tg > 0 && tg <= MAX_AIM_T && (t === null || tg < t)) t = tg;
  }
  if (t === null || !(t > 0)) return null;
  return [ray.ox + ray.dx * t, ray.oy + ray.dy * t, ray.oz + ray.dz * t];
}
