import { Suspense, useLayoutEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import manifest from '../../../public/assets/manifest.json';
import { HAND_PRINCIPAL_AXIS, HAND_WRIST_END } from '../../scenes/graveyard/model/handConstants';

/** Dev-only marker checked by the bundle guard (task 4.6). */
export const HAND_CLOSEUP_MARKER = '__zfr_hand_closeup__';

export const ANGLES = [
  'top',
  'side',
  'front',
  'three-quarter-left',
  'three-quarter-right',
  'rising-preview',
] as const;
export type Angle = (typeof ANGLES)[number];

const HAND_KEY = 'models/sketchfab-zombie-hand-craggle/sketchfab-zombie-hand-craggle.glb';
const HAND_URL = `/assets/${HAND_KEY}`;
const END_BIN = 0.1; // outer 10% of the projected range defines an end
const RISE_TILT_DEG = 70;

export function parseAngle(value: string | null): Angle {
  return (ANGLES as readonly string[]).includes(value ?? '')
    ? (value as Angle)
    : 'three-quarter-left';
}

interface Measured {
  /** Hand scene, shifted so the geometry centroid sits at the origin. */
  center: THREE.Vector3;
  wrist: THREE.Vector3;
  tip: THREE.Vector3;
  length: number;
}

/** Project all vertices on the principal axis and take the centroid of each end bin. */
function measure(root: THREE.Object3D): Measured {
  root.updateWorldMatrix(true, true);
  const axis = new THREE.Vector3(...HAND_PRINCIPAL_AXIS).normalize();
  const pts: { p: THREE.Vector3; t: number }[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const pos = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      pts.push({ p: v.clone(), t: v.dot(axis) });
    }
  });
  const center = new THREE.Vector3();
  let min = Infinity;
  let max = -Infinity;
  for (const { p, t } of pts) {
    center.add(p);
    min = Math.min(min, t);
    max = Math.max(max, t);
  }
  center.divideScalar(Math.max(pts.length, 1));
  const length = max - min;
  const hi = new THREE.Vector3();
  const lo = new THREE.Vector3();
  let nHi = 0;
  let nLo = 0;
  for (const { p, t } of pts) {
    if (t >= max - END_BIN * length) {
      hi.add(p);
      nHi++;
    }
    if (t <= min + END_BIN * length) {
      lo.add(p);
      nLo++;
    }
  }
  hi.divideScalar(Math.max(nHi, 1));
  lo.divideScalar(Math.max(nLo, 1));
  const wrist = HAND_WRIST_END === 1 ? hi : lo;
  const tip = HAND_WRIST_END === 1 ? lo : hi;
  return { center, wrist, tip, length };
}

function Rig({ angle, target, dist }: { angle: Angle; target: THREE.Vector3; dist: number }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const d = dist;
    const offsets: Record<Angle, [number, number, number]> = {
      top: [0, d, 0.001],
      side: [0, 0.15 * d, d],
      front: [d, 0.15 * d, 0],
      'three-quarter-left': [-0.7 * d, 0.6 * d, 0.7 * d],
      'three-quarter-right': [0.7 * d, 0.6 * d, 0.7 * d],
      'rising-preview': [0.5 * d, 0.2 * d, d],
    };
    const [x, y, z] = offsets[angle];
    if (angle === 'top') camera.up.set(0, 0, -1);
    else camera.up.set(0, 1, 0);
    camera.position.set(target.x + x, target.y + y, target.z + z);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [angle, camera, dist, target]);
  return null;
}

function Hand({ angle }: { angle: Angle }) {
  const gltf = useGLTF(HAND_URL, false);
  const { object, m } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    return { object: clone, m: measure(clone) };
  }, [gltf.scene]);

  // Pose: flat = centroid at origin lifted to rest on the ground; rising = wrist pivot at ground, fingers up.
  const pose = useMemo(() => {
    const quat = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    if (angle === 'rising-preview') {
      const fingerDir = m.tip.clone().sub(m.wrist).normalize();
      const tilt = THREE.MathUtils.degToRad(RISE_TILT_DEG);
      const up = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
      quat.setFromUnitVectors(fingerDir, up);
      pos.copy(m.wrist).applyQuaternion(quat).negate();
    } else {
      pos.copy(m.center).negate();
      const box = new THREE.Box3().setFromObject(object);
      pos.y += m.center.y - box.min.y;
    }
    return { quat, pos };
  }, [angle, m, object]);

  const target = useMemo(
    () =>
      angle === 'rising-preview'
        ? new THREE.Vector3(0, m.length * 0.4, 0)
        : new THREE.Vector3(0, m.length * 0.08, 0),
    [angle, m.length],
  );

  const markerPos = (p: THREE.Vector3) => p.clone().applyQuaternion(pose.quat).add(pose.pos);
  const r = m.length * 0.04;
  const wristPos = markerPos(m.wrist);
  const tipPos = markerPos(m.tip);

  return (
    <>
      <Rig angle={angle} target={target} dist={m.length * 2.2} />
      <group quaternion={pose.quat} position={pose.pos}>
        <primitive object={object} />
      </group>
      <mesh position={wristPos} renderOrder={10}>
        <sphereGeometry args={[r, 16, 12]} />
        <meshBasicMaterial color="#22c55e" depthTest={false} />
      </mesh>
      <mesh position={tipPos} renderOrder={10}>
        <sphereGeometry args={[r, 16, 12]} />
        <meshBasicMaterial color="#ef4444" depthTest={false} />
      </mesh>
      <axesHelper args={[m.length * 0.6]} />
      <ReadyFlag />
    </>
  );
}

function ReadyFlag() {
  // Rendered only after the hand loaded; the screenshot script waits for it.
  useLayoutEffect(() => {
    document.body.dataset.handReady = 'true';
    return () => {
      delete document.body.dataset.handReady;
    };
  }, []);
  return null;
}

export function HandCloseup({ angle }: { angle: Angle }) {
  const wristLabel = HAND_WRIST_END === 1 ? 'wrist end = +axis' : 'wrist end = -axis';
  const manifestOk = HAND_KEY in manifest.files;
  return (
    <div
      data-marker={HAND_CLOSEUP_MARKER}
      style={{ position: 'fixed', inset: 0, background: '#555' }}
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 35, near: 0.01, far: 1000, position: [0, 1, 3] }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#555555');
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={2.2} />
        <Grid
          args={[10, 10]}
          cellSize={0.1}
          sectionSize={0.5}
          cellColor="#777777"
          sectionColor="#999999"
          fadeDistance={12}
          infiniteGrid
        />
        {manifestOk ? (
          <Suspense fallback={null}>
            <Hand angle={angle} />
          </Suspense>
        ) : null}
      </Canvas>
      <div
        style={{
          position: 'fixed',
          left: 16,
          top: 16,
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.65)',
          color: '#fff',
          font: '14px/1.5 ui-monospace, monospace',
        }}
      >
        <div>Craggle hand · angle: {angle}</div>
        <div>{wristLabel}</div>
        <div>
          <span style={{ color: '#22c55e' }}>●</span> proposed wrist end (narrow forearm)
        </div>
        <div>
          <span style={{ color: '#ef4444' }}>●</span> opposite end (fingers)
        </div>
        <div>axes: red x, green y, blue z</div>
        {manifestOk ? null : <div>manifest key missing</div>}
      </div>
    </div>
  );
}
