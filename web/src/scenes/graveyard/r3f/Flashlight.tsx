import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  ConeGeometry,
  Object3D,
  Raycaster,
  Vector3,
  type Mesh,
  type SpotLight,
} from 'three';
import { useStore } from '../../../state/store';
import { flickerFactor, smooth } from '../layout/camera';
import { buildGrid } from '../layout/grid';
import type { GraveyardLayout } from '../layout/layout';
import { pickStone, type Ray } from '../layout/pick';
import { cameraStateRef } from './cameraState';
import {
  AIM_LAMBDA,
  CONE_OPACITY,
  FLASHLIGHT_ANGLE,
  FLASHLIGHT_COLOR,
  FLASHLIGHT_DECAY,
  FLASHLIGHT_DISTANCE,
  FLASHLIGHT_FALLBACK_TARGET,
  FLASHLIGHT_INTENSITY,
  FLASHLIGHT_OFFSET,
  FLASHLIGHT_PENUMBRA,
  FLASHLIGHT_SHADOW_MAP,
  aimPoint,
  writeFlashlightState,
} from './flashlightState';
import { getLastPointerRay } from './pointerPick';

const _off = new Vector3();
const _origin = new Vector3();
const _aim = new Vector3();

/** Cone with its apex at the origin, opening toward +z (so Object3D.lookAt aims it at the target). */
function makeConeGeometry(): ConeGeometry {
  const radius = FLASHLIGHT_DISTANCE * Math.tan(FLASHLIGHT_ANGLE);
  const g = new ConeGeometry(radius, FLASHLIGHT_DISTANCE, 32, 1, true);
  g.translate(0, -FLASHLIGHT_DISTANCE / 2, 0);
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Camera flashlight (design Section 10): spot light offset from the camera, aimed at the pointer
 * ray hit (stone or ground) with last-valid-target fallback, flickering, plus an additive cone.
 * Same parameters in both lights modes (10.11). The camera is not in the scene graph, so the
 * light is placed from the pose published by CameraRig.
 */
export function Flashlight({ layout }: { layout: GraveyardLayout }) {
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const gl = useThree((s) => s.gl);
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const light = useRef<SpotLight>(null);
  const cone = useRef<Mesh>(null);
  const target = useMemo(() => new Object3D(), []);
  const coneGeometry = useMemo(() => makeConeGeometry(), []);
  const raycaster = useMemo(() => new Raycaster(), []);
  const inside = useRef(false);
  const aim = useRef<[number, number, number]>([...FLASHLIGHT_FALLBACK_TARGET]);
  const goal = useRef<[number, number, number]>([...FLASHLIGHT_FALLBACK_TARGET]);

  useEffect(() => () => coneGeometry.dispose(), [coneGeometry]);

  useEffect(() => {
    const el = gl.domElement;
    const enter = () => {
      inside.current = true;
    };
    const leave = () => {
      inside.current = false;
    };
    el.addEventListener('pointermove', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, [gl]);

  // Priority -5: after CameraRig (-20) and SceneLights (-10); stays negative so r3f keeps rendering.
  useFrame((state, dtRaw) => {
    const spot = light.current;
    if (!spot) return;
    const dt = Math.min(dtRaw, 0.1);
    const cam = state.camera;
    cam.updateMatrixWorld();
    const pose = cameraStateRef.current.position;
    _off.set(FLASHLIGHT_OFFSET[0], FLASHLIGHT_OFFSET[1], FLASHLIGHT_OFFSET[2]);
    _off.applyQuaternion(cam.quaternion);
    _origin.set(pose[0] + _off.x, pose[1] + _off.y, pose[2] + _off.z);

    // Aim: live ray through the pointer, only while the pointer has been over the canvas.
    if (inside.current && getLastPointerRay()) {
      raycaster.setFromCamera(state.pointer, cam);
      const { origin: o, direction: d } = raycaster.ray;
      const ray: Ray = { ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z };
      const hit = pickStone(grid, layout, ray);
      const p = aimPoint(ray, hit ? hit.t : null);
      if (p) goal.current = p;
    }
    const a = aim.current;
    const g = goal.current;
    a[0] = smooth(a[0], g[0], dt, AIM_LAMBDA);
    a[1] = smooth(a[1], g[1], dt, AIM_LAMBDA);
    a[2] = smooth(a[2], g[2], dt, AIM_LAMBDA);

    spot.position.copy(_origin);
    target.position.set(a[0], a[1], a[2]);
    target.updateMatrixWorld();
    spot.updateMatrixWorld();
    const active = useStore.getState().framedPlot !== 'overview';
    spot.intensity = active ? FLASHLIGHT_INTENSITY * flickerFactor(state.clock.elapsedTime) : 0;

    const c = cone.current;
    if (c) {
      c.visible = active;
      c.position.copy(_origin);
      _aim.set(a[0], a[1], a[2]);
      c.lookAt(_aim);
    }
    writeFlashlightState([_origin.x, _origin.y, _origin.z], a, active);
  }, -5);

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        target={target}
        color={FLASHLIGHT_COLOR}
        intensity={FLASHLIGHT_INTENSITY}
        distance={FLASHLIGHT_DISTANCE}
        angle={FLASHLIGHT_ANGLE}
        penumbra={FLASHLIGHT_PENUMBRA}
        decay={FLASHLIGHT_DECAY}
        castShadow={!lowQuality}
        shadow-mapSize={[FLASHLIGHT_SHADOW_MAP, FLASHLIGHT_SHADOW_MAP]}
        shadow-camera-near={0.3}
        shadow-camera-far={FLASHLIGHT_DISTANCE}
        shadow-bias={-0.0004}
      />
      <mesh ref={cone} geometry={coneGeometry} frustumCulled={false} raycast={() => null}>
        <meshBasicMaterial
          color={FLASHLIGHT_COLOR}
          transparent
          opacity={CONE_OPACITY}
          blending={AdditiveBlending}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
