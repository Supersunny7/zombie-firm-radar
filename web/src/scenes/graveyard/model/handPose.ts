/**
 * Procedural rise pose of a Craggle hand (design Section 9). Pure: no three, no React.
 *
 * Instance matrix (applied right to left):
 *   T(mound) * Ry(faceCamera) * Rx(-tilt) * S(scale) * Ry(alignYaw) * T(-wristPivot)
 * where wristPivot is the wrist end of the geometry (HAND_WRIST_END side of the principal axis).
 * Ry(alignYaw) turns the finger direction (from wrist toward fingers) onto local +z; Rx(-tilt)
 * then lifts +z up out of the ground, tipping the fingers toward the camera side.
 */
import { HAND_PRINCIPAL_AXIS, HAND_WRIST_END } from './handConstants';

export const HAND_SCALE = 0.34;
/** Raised pose, degrees from horizontal. */
export const HAND_RAISED_TILT_DEG = 70;
/** Height of the wrist pivot below the mound top when buried (metres). */
export const HAND_BURIED_DEPTH = 0.35;

export interface HandPose {
  /** Height of the wrist pivot relative to the mound top, metres. */
  y: number;
  /** Rotation about x as a positive angle in radians; the matrix uses Rx(-tilt). */
  tilt: number;
  scale: number;
  /** Position offset, rotation (Euler x, y, z in radians, order Y then X as in the matrix) and scale. */
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  /** Yaw applied to model space before tilting so the fingers lie along +z. */
  alignYaw: number;
}

/** Unit vector from the wrist toward the fingers in model space, projected on the ground plane. */
export function fingerDirection(): readonly [number, number] {
  const [ax, , az] = HAND_PRINCIPAL_AXIS;
  const fx = -HAND_WRIST_END * ax;
  const fz = -HAND_WRIST_END * az;
  const len = Math.hypot(fx, fz);
  return [fx / len, fz / len];
}

/** Yaw (about y) that maps the finger direction onto +z. */
export function alignYaw(): number {
  const [fx, fz] = fingerDirection();
  return Math.atan2(-fx, fz);
}

function easeOutCubic(p: number): number {
  const q = 1 - p;
  return 1 - q * q * q;
}

/** progress 0 (buried, flat) to 1 (raised, 70 degrees). Monotone in progress; out-of-range input is clamped. */
export function handPose(progress: number): HandPose {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const e = easeOutCubic(p);
  const tilt = ((HAND_RAISED_TILT_DEG * Math.PI) / 180) * e;
  const y = HAND_BURIED_DEPTH * (e - 1);
  const yaw = alignYaw();
  return {
    y,
    tilt,
    scale: HAND_SCALE,
    position: [0, y, 0],
    rotation: [-tilt, yaw, 0],
    alignYaw: yaw,
  };
}
