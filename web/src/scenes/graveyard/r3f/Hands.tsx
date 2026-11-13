import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';
import { useShockView } from '../../../state/shockView';
import { effectiveReducedMotion, useStore } from '../../../state/store';
import { ASSET_KEYS, assetUrl } from '../assets';
import type { GraveyardLayout } from '../layout/layout';
import { planDressing } from '../model/dressing';
import { HAND_PRINCIPAL_AXIS, HAND_WRIST_END } from '../model/handConstants';
import {
  HAND_BUDGET,
  assignHands,
  createHandPool,
  slotProgress,
  stepHandPool,
  type HandPoolOptions,
  type HandPoolState,
} from '../model/handPool';
import { handPose } from '../model/handPose';
import { riseEvents } from '../riseEvents';
import { cameraStateRef } from './cameraState';
import { ModelBoundary } from './ModelBoundary';
import { buildStoneGeometry } from './stoneGeometry';

/** Rise and lower durations in seconds (lowering is 1.2 s as in the design). */
const RISE_SECONDS = 1.6;
const LOWER_SECONDS = 1.2;
/** Longest frame step fed to the pool, so a stalled tab does not skip the animation. */
const MAX_DT = 0.1;
/** Mound proportions, copied from Mounds.tsx: heap height, reach in front of the stone, ground offset. */
const MOUND_HEIGHT = 0.24;
const MOUND_FRONT = 0.45;
const MOUND_Y = -0.02;
/** The hand comes out this far in front of the stone face (metres). */
const HAND_FRONT_OFFSET = 0.22;
/** Outer fraction of the projected range that defines the wrist end. */
const END_BIN = 0.1;

/** Where one undead stone's hand sits: base point on the mound in front of the stone. */
interface HandSite {
  cik: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Centroid of the wrist-end bin of the geometry along HAND_PRINCIPAL_AXIS (HAND_WRIST_END side). */
function wristPivot(geometry: BufferGeometry): Vector3 {
  const pos = geometry.getAttribute('position');
  const axis = new Vector3(...HAND_PRINCIPAL_AXIS).normalize();
  const ts = new Float32Array(pos.count);
  const v = new Vector3();
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const t = v.fromBufferAttribute(pos, i).dot(axis);
    ts[i] = t;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const len = max - min;
  const sum = new Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    const t = ts[i]!;
    const inBin = HAND_WRIST_END === 1 ? t >= max - END_BIN * len : t <= min + END_BIN * len;
    if (!inBin) continue;
    sum.add(v.fromBufferAttribute(pos, i));
    n++;
  }
  return n > 0 ? sum.divideScalar(n) : new Vector3();
}

/** Mound-top point in front of a stone, in world space. */
function siteFor(cik: string, s: GraveyardLayout['stones'][number]): HandSite {
  const offset = s.depth / 2 + HAND_FRONT_OFFSET;
  const rz = s.depth / 2 + MOUND_FRONT;
  const k = Math.max(0, 1 - (offset / rz) ** 2);
  return {
    cik,
    x: s.x + Math.sin(s.yaw) * offset,
    y: MOUND_Y + MOUND_HEIGHT * Math.sqrt(k),
    z: s.z + Math.cos(s.yaw) * offset,
    yaw: s.yaw,
  };
}

const _m = new Matrix4();
const _t = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _qa = new Quaternion();
const _qb = new Quaternion();
const _qc = new Quaternion();
const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);

interface HandMeshProps {
  url: string;
  sites: ReadonlyMap<string, HandSite>;
}

function HandMesh({ url, sites }: HandMeshProps) {
  const gltf = useGLTF(url, false);
  const built = useMemo(() => buildStoneGeometry(gltf.scene, null), [gltf.scene]);
  const pivot = useMemo(() => wristPivot(built.geometry), [built]);
  useEffect(() => () => built.geometry.dispose(), [built]);

  const ref = useRef<InstancedMesh>(null);
  const pool = useRef<HandPoolState>(createHandPool());
  const desired = useRef<string[]>([]);
  const prevAtRest = useRef(false);
  const lastSites = useRef<ReadonlyMap<string, HandSite> | null>(null);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const cam = cameraStateRef.current;

    // Recompute the nearest eight when the undead set changed, or when the camera just came to rest.
    const dirty = lastSites.current !== sites;
    if (dirty || (cam.atRest && !prevAtRest.current)) {
      const [cx, cy, cz] = cam.position;
      const candidates = [...sites.values()].map((h) => ({
        cik: h.cik,
        dist: Math.hypot(h.x - cx, h.y - cy, h.z - cz),
      }));
      desired.current = assignHands(candidates, HAND_BUDGET);
      lastSites.current = sites;
    }
    prevAtRest.current = cam.atRest;

    const opts: HandPoolOptions = {
      reduced: effectiveReducedMotion(useStore.getState()),
      riseSeconds: RISE_SECONDS,
      lowerSeconds: LOWER_SECONDS,
    };
    const dt = Math.min(MAX_DT, Math.max(0, delta));
    const { state, started } = stepHandPool(pool.current, desired.current, dt, opts);
    pool.current = state;

    // One event per hand start; this component only exists once the model has loaded.
    for (const cik of started) {
      const h = sites.get(cik);
      if (h) riseEvents.emit({ cik, position: [h.x, h.y, h.z] });
    }

    _t.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    state.slots.forEach((slot, i) => {
      const h = slot.cik === null ? undefined : sites.get(slot.cik);
      if (slot.state === 'idle' || !h) {
        _m.makeScale(0, 0, 0); // hidden slot
        mesh.setMatrixAt(i, _m);
        return;
      }
      const pose = handPose(slotProgress(slot, opts));
      // T(site + pose.y) * Ry(stone yaw) * Rx(-tilt) * S * Ry(alignYaw) * T(-wristPivot)
      _p.set(h.x, h.y + pose.y, h.z);
      _qa.setFromAxisAngle(Y_AXIS, h.yaw);
      _qb.setFromAxisAngle(X_AXIS, pose.rotation[0]);
      _qc.setFromAxisAngle(Y_AXIS, pose.alignYaw);
      _qa.multiply(_qb).multiply(_qc);
      _s.setScalar(pose.scale);
      _m.compose(_p, _qa, _s).multiply(_t);
      mesh.setMatrixAt(i, _m);
    });
    mesh.count = HAND_BUDGET;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[built.geometry, built.material, HAND_BUDGET]}
      raycast={() => null}
      frustumCulled={false}
      castShadow
      receiveShadow
      name="hands"
    />
  );
}

/**
 * Craggle hands (Requirement 14): up to 8 instances in one InstancedMesh, at the mounds of the
 * undead stones nearest to the camera. Renders nothing, and emits no rise events, if the model
 * is missing from the manifest or fails to load; mounds and Broken stones are separate.
 */
export function Hands({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const url = assetUrl(ASSET_KEYS.craggleHand);

  const sites = useMemo(() => {
    const map = new Map<string, HandSite>();
    for (const i of planDressing(firms, batch, 'off').mounds) {
      const f = firms[i];
      const s = layout.stones[i];
      if (f && s) map.set(f.cik, siteFor(f.cik, s));
    }
    return map;
  }, [firms, batch, layout]);

  useEffect(() => {
    if (!url) console.warn('[graveyard] asset skipped: craggle hand is not in the manifest');
  }, [url]);

  if (!url) return null;
  return (
    <ModelBoundary
      name="craggle-hand"
      onError={(e) => console.warn('[graveyard] asset skipped: craggle hand failed to load', e)}
    >
      <Suspense fallback={null}>
        <HandMesh url={url} sites={sites} />
      </Suspense>
    </ModelBoundary>
  );
}
