import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { effectiveReducedMotion, useStore } from '../../../state/store';
import {
  overviewPose,
  plotPose,
  smooth,
  swayAmplitude,
  swayOffset,
  LOOK_LAMBDA,
  type CameraPose,
} from '../layout/camera';
import type { GraveyardLayout } from '../layout/layout';
import { LOOK_CAMERA } from '../look';
import { CAMERA_FAR } from '../model/sceneParams';
import type { CameraFogState } from '../model/sceneParams';
import { writeCameraState } from './cameraState';
import { cameraFogRef } from './lightsBlend';

/** Vertical field of view in degrees (Requirement 23.1). */
export const CAMERA_FOV = LOOK_CAMERA.fovDeg;
export const CAMERA_NEAR = 0.1;
export const MOVE_SECONDS = 1.2;
/** Pointer look offset in metres at the screen edge (design Section 10). */
const LOOK_X = 3.2;
const LOOK_Y = 1.3;
/** Focus pan keeps the stone inside the middle 60% of the view. */
const PAN_FRACTION = 0.6;
const FALLBACK_PLOT = { centerX: 0, frontZ: 3 } as const;

type Target = number | 'overview';
type V3 = [number, number, number];

const smoothstep = (t: number): number => t * t * (3 - 2 * t);
const lerp3 = (a: V3, b: V3, t: number, out: V3): void => {
  for (let i = 0; i < 3; i++) out[i] = a[i]! + (b[i]! - a[i]!) * t;
};

/**
 * Camera rig: FOV 46 camera framing a plot or the overview. Plot moves are 1.2 s smoothstep
 * tweens (instant under Reduced_Motion), with handheld sway, a pointer look offset smoothed with
 * lambda 4, and a keyboard focus pan. Publishes the fog state and the pose through mutable refs.
 */
export function CameraRig({ layout }: { layout: GraveyardLayout }) {
  const layoutRef = useRef(layout);
  useLayoutEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const rig = useRef({
    init: false,
    key: '',
    moving: false,
    elapsed: 0,
    from: [0, 0, 0] as V3,
    to: [0, 0, 0] as V3,
    fromT: [0, 0, 0] as V3,
    toT: [0, 0, 0] as V3,
    pos: [0, 0, 0] as V3,
    tgt: [0, 0, 0] as V3,
    look: [0, 0] as [number, number],
    fogFrom: 0 as Target,
    fogTo: 0 as Target,
    pan: 0,
    lastTarget: 0 as Target,
    lastFocus: null as string | null,
    lastPublished: null as CameraFogState | null,
  });

  // Release the published fog state so other components fall back to their default on unmount.
  useLayoutEffect(
    () => () => {
      cameraFogRef.current = null;
    },
    [],
  );

  useFrame((state, dtRaw) => {
    const cam = state.camera;
    if (!(cam instanceof PerspectiveCamera)) return;
    const dt = Math.min(dtRaw, 0.1);
    const r = rig.current;
    if (cam.fov !== CAMERA_FOV || cam.near !== CAMERA_NEAR || cam.far !== CAMERA_FAR) {
      cam.fov = CAMERA_FOV;
      cam.near = CAMERA_NEAR;
      cam.far = CAMERA_FAR;
      cam.updateProjectionMatrix();
    }
    const st = useStore.getState();
    const lay = layoutRef.current;
    const reduced = effectiveReducedMotion(st);
    const aspect = cam.aspect;

    // Target: the store's framed plot, clamped to the plots that exist (store written only on change).
    let target: Target = st.framedPlot;
    if (target !== 'overview' && lay.plots.length > 0 && target > lay.plots.length - 1) {
      target = lay.plots.length - 1;
      st.setFramedPlot(target);
    }

    const poseFor = (t: Target, pan: number): CameraPose => {
      if (t === 'overview') {
        return lay.plots.length > 0
          ? overviewPose(lay.bounds, CAMERA_FOV, aspect)
          : plotPose(FALLBACK_PLOT);
      }
      const base = plotPose(lay.plots[t] ?? FALLBACK_PLOT);
      return {
        position: [base.position[0] + pan, base.position[1], base.position[2]],
        target: [base.target[0] + pan, base.target[1], base.target[2]],
      };
    };

    // Plot change resets the pan.
    if (target !== r.lastTarget) {
      r.pan = 0;
      r.lastTarget = target;
    }

    // Focus pan: only for a stone of the framed plot that leaves the middle 60% of the view.
    if (st.focusedCik !== r.lastFocus) {
      r.lastFocus = st.focusedCik;
      if (st.focusedCik !== null && target !== 'overview') {
        const firmIdx = st.data?.index.firms.findIndex((f) => f.cik === st.focusedCik) ?? -1;
        const stone = lay.stones[firmIdx];
        const plot = lay.plots[target];
        if (stone && plot && stone.plot === target) {
          const base = poseFor(target, 0).position;
          const halfW =
            Math.max(0.1, base[2] - stone.z) * Math.tan((CAMERA_FOV * Math.PI) / 360) * aspect;
          const limit = PAN_FRACTION * halfW;
          const rel = stone.x - (base[0] + r.pan);
          if (Math.abs(rel) > limit) {
            const wanted = r.pan + rel - Math.sign(rel) * limit;
            r.pan = Math.min(plot.rect.x1 - base[0], Math.max(plot.rect.x0 - base[0], wanted));
          }
        }
      }
    }

    const goal = poseFor(target, r.pan);
    const key = `${target}|${r.pan}`;

    if (!r.init) {
      r.init = true;
      r.key = key;
      r.pos = [...goal.position];
      r.tgt = [...goal.target];
      r.fogFrom = target;
      r.fogTo = target;
    } else if (key !== r.key) {
      const targetChanged = r.fogTo !== target;
      if (targetChanged) {
        // Mid-move retargets start fog from whichever end is closer.
        const mid = r.moving && r.elapsed / MOVE_SECONDS < 0.5;
        r.fogFrom = r.moving ? (mid ? r.fogFrom : r.fogTo) : r.fogTo;
        r.fogTo = target;
      }
      r.key = key;
      if (reduced) {
        r.moving = false;
        r.fogFrom = target;
        r.fogTo = target;
        r.pos = [...goal.position];
        r.tgt = [...goal.target];
      } else {
        r.from = [...r.pos];
        r.fromT = [...r.tgt];
        r.elapsed = 0;
        r.moving = true;
      }
    }

    r.to = [...goal.position];
    r.toT = [...goal.target];
    if (r.moving) {
      r.elapsed += dt;
      const p = Math.min(1, r.elapsed / MOVE_SECONDS);
      const s = smoothstep(p);
      lerp3(r.from, r.to, s, r.pos);
      lerp3(r.fromT, r.toT, s, r.tgt);
      if (p >= 1) {
        r.moving = false;
        r.fogFrom = r.fogTo;
        r.pos = [...r.to];
        r.tgt = [...r.toT];
      }
    } else {
      // At rest (also covers aspect changes in the overview).
      r.pos = [...r.to];
      r.tgt = [...r.toT];
    }

    // Fog state: progress follows the move; at rest from === to and progress = 1.
    const progress = r.moving ? smoothstep(Math.min(1, r.elapsed / MOVE_SECONDS)) : 1;
    const prev = r.lastPublished;
    if (!prev || prev.from !== r.fogFrom || prev.to !== r.fogTo || prev.progress !== progress) {
      const next: CameraFogState = r.moving
        ? { from: r.fogFrom, to: r.fogTo, progress }
        : { from: r.fogTo, to: r.fogTo, progress: 1 };
      r.lastPublished = next;
      cameraFogRef.current = next;
    }

    // Look offset: pointer-driven inside a plot, smoothed with lambda 4 (disabled for Reduced_Motion).
    const inPlot = target !== 'overview';
    const gx = inPlot ? state.pointer.x * LOOK_X : 0;
    const gy = inPlot ? state.pointer.y * LOOK_Y : 0;
    if (reduced) {
      r.look[0] = gx;
      r.look[1] = gy;
    } else {
      r.look[0] = smooth(r.look[0], gx, dt, LOOK_LAMBDA);
      r.look[1] = smooth(r.look[1], gy, dt, LOOK_LAMBDA);
    }

    const [sx, sy] = swayOffset(
      swayAmplitude(st.settings.lights, reduced),
      state.clock.elapsedTime,
    );
    const px = r.pos[0] + sx;
    const py = r.pos[1] + sy;
    const lx = r.tgt[0] + r.look[0];
    const ly = r.tgt[1] + r.look[1];
    cam.position.set(px, py, r.pos[2]);
    cam.lookAt(lx, ly, r.tgt[2]);

    writeCameraState([px, py, r.pos[2]], [lx, ly, r.tgt[2]], !r.moving, target);
    // Priority -20: runs before SceneLights (-10) so fog and shadows use this frame's pose.
  }, -20);

  return null;
}
