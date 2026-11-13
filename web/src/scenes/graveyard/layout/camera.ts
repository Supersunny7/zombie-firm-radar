/**
 * Camera rig maths (pure, design Section 10). No React or three imports.
 * Poses are plain tuples; the rig converts them to vectors.
 */
import { LOOK_CAMERA } from '../look';
import type { LightsMode } from '../model/sceneParams';
import type { PlotLayout, Rect } from './layout';

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  readonly position: Vec3;
  readonly target: Vec3;
}

/** Plot_Camera_Pose values from the prototype camera (Requirement 23.1, `look.ts`). */
export const CAMERA_HEIGHT = LOOK_CAMERA.eyeHeight;
export const CAMERA_BACK = LOOK_CAMERA.back;
export const TARGET_Y = LOOK_CAMERA.lookHeight;
export const TARGET_AHEAD = LOOK_CAMERA.targetAhead;
export const LOOK_LAMBDA = 4;
export const OVERVIEW_PITCH = Math.PI / 3;
export const OVERVIEW_MARGIN = 1.05;

/**
 * Pose that frames one plot (10.7, 10.8). Plot 1 (frontZ = 3) gives (0, 1.2, 5.7) looking at
 * (0, 0.6, 2.0) (Requirement 23.1). The pose is the same for every aspect ratio: three's fov is
 * vertical, so the nearest mound bases stay in the lower half in portrait too (23.3).
 */
export function plotPose(plot: Pick<PlotLayout, 'centerX' | 'frontZ'>): CameraPose {
  return {
    position: [plot.centerX, CAMERA_HEIGHT, plot.frontZ + CAMERA_BACK],
    target: [plot.centerX, TARGET_Y, plot.frontZ - TARGET_AHEAD],
  };
}

export interface Ndc {
  /** -1 (left) to 1 (right) when inside the frame. */
  readonly x: number;
  /** -1 (bottom) to 1 (top) when inside the frame. */
  readonly y: number;
  /** Distance along the view axis; positive in front of the camera. */
  readonly depth: number;
}

/**
 * Project a world point to normalised device coordinates for a look-at camera with world up (0, 1, 0).
 * `fovDeg` is the vertical field of view; `aspect` is width / height. Returns null when the point is
 * at or behind the camera plane. Pure: no three import.
 */
export function projectToNdc(
  pose: CameraPose,
  point: Vec3,
  fovDeg: number,
  aspect: number,
): Ndc | null {
  const [px, py, pz] = pose.position;
  let fx = pose.target[0] - px;
  let fy = pose.target[1] - py;
  let fz = pose.target[2] - pz;
  const fl = Math.hypot(fx, fy, fz);
  if (!(fl > 0)) return null;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = f x up(0,1,0) = (-fz, 0, fx); a vertical view axis has no defined roll.
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  if (rl < 1e-9) {
    rx = 1;
    rz = 0;
  } else {
    rx /= rl;
    rz /= rl;
  }
  // up = right x f
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const vx = point[0] - px;
  const vy = point[1] - py;
  const vz = point[2] - pz;
  const depth = vx * fx + vy * fy + vz * fz;
  if (!(depth > 1e-9)) return null;
  const tv = Math.tan((fovDeg * Math.PI) / 360);
  const th = tv * aspect;
  return {
    x: (vx * rx + vz * rz) / (depth * th),
    y: (vx * ux + vy * uy + vz * uz) / (depth * tv),
    depth,
  };
}
/** Frame-rate independent exponential smoothing: cur += (goal - cur) * (1 - exp(-lambda * dt)). */
export function smooth(
  cur: number,
  goal: number,
  dt: number,
  lambda: number = LOOK_LAMBDA,
): number {
  if (!(dt > 0)) return cur;
  return cur + (goal - cur) * (1 - Math.exp(-lambda * dt));
}

/** Handheld sway amplitude in metres (10.9, 10.10). */
export function swayAmplitude(lights: LightsMode, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return lights === 'off' ? 0.035 : 0.02;
}

/** Sway offset (x, y) at time t seconds for amplitude `a`. */
export function swayOffset(a: number, t: number): readonly [number, number] {
  return [a * Math.sin(0.7 * t), a * 0.6 * Math.sin(1.1 * t + 1)];
}

/**
 * High pose over the bounds centre, pitched 60 degrees down, at the smallest distance where the
 * bounds rectangle (plus a 5% margin) fits the vertical and horizontal frustum (11.3).
 * `fovDeg` is the vertical field of view in degrees.
 *
 * With the camera on the line through the centre at 60 degrees, a ground point at offset (dx, dz)
 * from the centre has depth D - dz*cos(p) and camera-space (x, y) = (dx, -dz*sin(p)), where D is the
 * camera distance from the centre. Each corner gives two lower bounds on D.
 */
export function overviewPose(bounds: Rect, fovDeg: number, aspect: number): CameraPose {
  const cx = (bounds.x0 + bounds.x1) / 2;
  const cz = (bounds.z0 + bounds.z1) / 2;
  const hx = ((bounds.x1 - bounds.x0) / 2) * OVERVIEW_MARGIN;
  const hz = ((bounds.z1 - bounds.z0) / 2) * OVERVIEW_MARGIN;
  const tv = Math.tan((fovDeg * Math.PI) / 360);
  const th = tv * Math.max(aspect, 1e-6);
  const sinP = Math.sin(OVERVIEW_PITCH);
  const cosP = Math.cos(OVERVIEW_PITCH);
  let dist = 1;
  for (const dz of [-hz, hz]) {
    dist = Math.max(dist, dz * cosP + hx / th, dz * cosP + (hz * sinP) / tv);
  }
  return {
    position: [cx, dist * sinP, cz + dist * cosP],
    target: [cx, 0, cz],
  };
}

export type PlotDir = 'left' | 'right';

/** Previous or next plot, clamped to [0, count - 1], never wrapping (11.4, 11.5). */
export function nextPlot(current: number, dir: PlotDir, count: number): number {
  if (count <= 0) return 0;
  const next = current + (dir === 'right' ? 1 : -1);
  return Math.min(count - 1, Math.max(0, next));
}

/** "PLOT {n} — {SECTOR} · {count} GRAVES" (11.6); empty string for an unknown index. */
export function plotLabel(
  plots: readonly Pick<PlotLayout, 'sector' | 'count'>[],
  index: number,
): string {
  const p = plots[index];
  if (!p) return '';
  return `PLOT ${index + 1} \u2014 ${p.sector.toUpperCase()} \u00b7 ${p.count} GRAVES`;
}

/** "OVERVIEW · {plotCount} PLOTS" (11.7). */
export function overviewLabel(plotCount: number): string {
  return `OVERVIEW \u00b7 ${plotCount} PLOTS`;
}
