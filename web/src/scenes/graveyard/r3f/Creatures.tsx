import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Matrix4, Mesh, Quaternion, Sphere, Vector3 } from 'three';
import type { Group, Object3D } from 'three';
import { fnv1a32 } from '../../../engine/hash';
import { mulberry32 } from '../../../engine/rng';
import { useStore } from '../../../state/store';
import { ASSET_KEYS, assetUrl } from '../assets';
import type { GraveyardLayout } from '../layout/layout';
import { coneCovers } from '../model/coneCovers';
import { corpseAnchor, INITIAL_CAMERA, mutantPlacement } from '../model/placement';
import { ModelBoundary } from './ModelBoundary';
import { flashlightStateRef } from './flashlightState';

/** Corpse length after scaling (raw model is about 12 cm; design Section 8 asks for about 1.7 m). */
const CORPSE_LENGTH = 1.7;
/** The grave opening is the mound front edge, this far in front of the stone base (design 8). */
const GRAVE_OPENING = 0.35;
/** Pitch of the corpse into the ground, radians (8 degrees). */
const CORPSE_PITCH = (8 * Math.PI) / 180;
/** Buried share of the corpse height: 50% plus or minus 10% (9.6). */
const BURIED_MIN = 0.4;
const BURIED_SPAN = 0.2;

// Reused every frame: no allocation in the Mutant visibility path.
const _origin = { x: 0, y: 0, z: 0 };
const _dir = { x: 0, y: 0, z: 0 };
const _sphere = { center: { x: 0, y: 0, z: 0 }, radius: 0 };

function skip(key: string, reason: string): void {
  console.warn('[graveyard] asset skipped', key, reason);
}

/** Renders `children` for a manifest key; omits it with a warning when it is not listed or fails. */
function CreatureSlot({
  assetKey,
  children,
}: {
  assetKey: string;
  children: (url: string) => ReactNode;
}) {
  const url = assetUrl(assetKey);
  useEffect(() => {
    if (!url) skip(assetKey, 'not in manifest');
  }, [url, assetKey]);
  if (!url) return null;
  return (
    <ModelBoundary name={assetKey} onError={(e) => skip(assetKey, e.message)}>
      <Suspense fallback={null}>{children(url)}</Suspense>
    </ModelBoundary>
  );
}

function shade(root: Object3D): void {
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });
}

/** Static model, hidden until the flashlight cone covers its bounding sphere (9.2 to 9.4). */
function Mutant({ url, layout }: { url: string; layout: GraveyardLayout }) {
  const { scene } = useGLTF(url, false);
  const ref = useRef<Group>(null);

  const built = useMemo(() => {
    const object = scene.clone(true);
    shade(object);
    const box = new Box3().setFromObject(object);
    const p = mutantPlacement(layout);
    // Stand on the ground, facing the start camera position.
    const yaw = Math.atan2(INITIAL_CAMERA.x - p.x, INITIAL_CAMERA.z - p.z);
    const center = box.getCenter(new Vector3());
    const groundY = -box.min.y;
    const offset = new Vector3(center.x, 0, center.z);
    // The group is rotated about y only, so the sphere centre is the rotated box centre.
    const c = new Vector3(center.x, center.y + groundY, center.z).applyAxisAngle(
      new Vector3(0, 1, 0),
      yaw,
    );
    const sphere = box.getBoundingSphere(new Sphere());
    sphere.center.set(p.x + c.x, c.y, p.z + c.z);
    object.position.set(-offset.x, groundY, -offset.z);
    return { object, x: p.x, z: p.z, yaw, sphere };
  }, [scene, layout]);

  // Hidden until the first frame has run the cone test.
  useEffect(() => {
    if (ref.current) ref.current.visible = false;
  }, [built]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const s = flashlightStateRef.current;
    _origin.x = s.origin[0];
    _origin.y = s.origin[1];
    _origin.z = s.origin[2];
    _dir.x = s.direction[0];
    _dir.y = s.direction[1];
    _dir.z = s.direction[2];
    _sphere.center.x = built.sphere.center.x;
    _sphere.center.y = built.sphere.center.y;
    _sphere.center.z = built.sphere.center.z;
    _sphere.radius = built.sphere.radius;
    const vis = s.active && coneCovers(_origin, _dir, s.halfAngle, s.range, _sphere);
    if (g.visible !== vis) g.visible = vis;
  });

  return (
    <group ref={ref} position={[built.x, 0, built.z]} rotation-y={built.yaw} visible={false}>
      <primitive object={built.object} />
    </group>
  );
}

const _basisX = new Vector3();
const _basisY = new Vector3();
const _basisZ = new Vector3();
const UP = new Vector3(0, 1, 0);

/**
 * Corpse lying on its back in front of the grave, long axis toward the camera, pitched into the
 * soil and sunk so 50% plus or minus 10% of its height is below ground. No blood in either mode.
 */
function Corpse({
  url,
  layout,
  stoneIndex,
  cik,
}: {
  url: string;
  layout: GraveyardLayout;
  stoneIndex: number;
  cik: string;
}) {
  const { scene } = useGLTF(url, false);
  const built = useMemo(() => {
    const stone = layout.stones[stoneIndex];
    if (!stone) return null;
    const object = scene.clone(true);
    shade(object);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    // The raw model is long along y and thin along z (design Section 8).
    const scale = CORPSE_LENGTH / Math.max(size.y, 1e-6);

    const front = stone.depth / 2 + GRAVE_OPENING;
    const ox = stone.x + Math.sin(stone.yaw) * front;
    const oz = stone.z + Math.cos(stone.yaw) * front;
    let hx = INITIAL_CAMERA.x - ox;
    let hz = INITIAL_CAMERA.z - oz;
    const hl = Math.hypot(hx, hz) || 1;
    hx /= hl;
    hz /= hl;

    // Long axis toward the camera; the grave end is 8 degrees lower than the camera end.
    _basisY.set(hx * Math.cos(CORPSE_PITCH), Math.sin(CORPSE_PITCH), hz * Math.cos(CORPSE_PITCH));
    _basisZ.copy(UP).addScaledVector(_basisY, -UP.dot(_basisY)).normalize();
    _basisX.crossVectors(_basisY, _basisZ);
    const quat = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(_basisX, _basisY, _basisZ),
    );

    const rot = new Matrix4().compose(new Vector3(), quat, new Vector3(scale, scale, scale));
    const rotated = box.clone().applyMatrix4(rot);
    const height = rotated.max.y - rotated.min.y;
    const buried = BURIED_MIN + BURIED_SPAN * mulberry32(fnv1a32(cik))();
    const c = rotated.getCenter(new Vector3());
    // Centre of the body on the line from the grave opening toward the camera.
    const half = (CORPSE_LENGTH / 2) * Math.cos(CORPSE_PITCH) * 0.5;
    const px = ox + hx * half - c.x;
    const pz = oz + hz * half - c.z;
    const py = -buried * height - rotated.min.y;
    return { object, quat, scale, position: [px, py, pz] as const };
  }, [scene, layout, stoneIndex, cik]);
  if (!built) return null;
  return (
    <group
      position={[...built.position]}
      quaternion={built.quat}
      scale={built.scale}
      name="creature-corpse"
    >
      <primitive object={built.object} />
    </group>
  );
}

function CreaturesContent({ layout }: { layout: GraveyardLayout }) {
  const firms = useStore((s) => s.data?.index.firms);
  const anchor = useMemo(
    () => corpseAnchor(layout, (i) => firms?.[i]?.status === 'zombie'),
    [layout, firms],
  );
  const cik = anchor === null ? '' : (firms?.[anchor]?.cik ?? '');
  return (
    <>
      <CreatureSlot assetKey={ASSET_KEYS.mutant}>
        {(u) => <Mutant url={u} layout={layout} />}
      </CreatureSlot>
      {anchor === null ? null : (
        <CreatureSlot assetKey={ASSET_KEYS.greenallCorpse}>
          {(u) => <Corpse url={u} layout={layout} stoneIndex={anchor} cik={cik} />}
        </CreatureSlot>
      )}
    </>
  );
}

/**
 * Mutant (cone-revealed, both lights modes, no audio) and the half-buried corpse (requirement 9).
 * Loading starts after the first rendered frame, like the props. Failures omit the creature.
 */
export function Creatures({ layout }: { layout: GraveyardLayout }) {
  const [go, setGo] = useState(false);
  const scheduled = useRef(false);
  const raf = useRef(0);

  useFrame(() => {
    if (scheduled.current) return;
    scheduled.current = true;
    raf.current = requestAnimationFrame(() => setGo(true));
  });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return go ? <CreaturesContent layout={layout} /> : null;
}
