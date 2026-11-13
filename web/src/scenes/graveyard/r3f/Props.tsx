import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import {
  Box3,
  DoubleSide,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { BufferGeometry, InstancedMesh, Material, Object3D } from 'three';
import { mulberry32 } from '../../../engine/rng';
import { ASSET_KEYS, assetUrl } from '../assets';
import type { GraveyardLayout } from '../layout/layout';
import { resolveProps } from '../props';
import type { Placement } from '../props';
import { ModelBoundary } from './ModelBoundary';

function skip(key: string, reason: string): void {
  console.warn('[graveyard] asset skipped', key, reason);
}

/** Renders `children` for a manifest key; skips with a warning when it is not listed or fails. */
function PropSlot({
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

function shade(root: Object3D, cast: boolean): void {
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = cast;
      o.receiveShadow = true;
    }
  });
}

/** Cool near-black of the gate silhouette; darker than the horizon fog (#171b21) it stands against. */
export const SILHOUETTE_COLOR = '#0a0f18';

/**
 * The gate sits about 110 m behind the plot camera, where Plot_Fog (0.085) would hide it fully.
 * Unlit, fog-exempt, depth-tested material: a dark silhouette at the horizon in both lights modes.
 */
function silhouetteMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: SILHOUETTE_COLOR, fog: false });
}

function GltfProp({
  url,
  p,
  cast = true,
  silhouette = false,
}: {
  url: string;
  p: Placement;
  cast?: boolean;
  silhouette?: boolean;
}) {
  const { scene } = useGLTF(url, false);
  const material = useMemo(() => (silhouette ? silhouetteMaterial() : null), [silhouette]);
  useEffect(() => () => material?.dispose(), [material]);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    shade(clone, cast && !silhouette);
    if (material) {
      clone.traverse((o) => {
        if (o instanceof Mesh) {
          o.material = material;
          o.receiveShadow = false;
        }
      });
    }
    return clone;
  }, [scene, cast, silhouette, material]);
  return (
    <group position={[p.x, p.y, p.z]} rotation-y={p.yaw} scale={p.scale}>
      <primitive object={object} />
    </group>
  );
}

/** Lantern glass uses KHR_materials_transmission; swap it for a plain emissive transparent material. */
function Lantern({
  url,
  p,
  light,
  lightPosition,
}: {
  url: string;
  p: Placement;
  light: { color: string; intensity: number; distance: number; decay: number };
  lightPosition: readonly [number, number, number];
}) {
  const { scene } = useGLTF(url, false);
  const { object, glass } = useMemo(() => {
    const clone = scene.clone(true);
    shade(clone, false);
    const g = new MeshStandardMaterial({
      color: '#ffd9a0',
      emissive: light.color,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
    });
    clone.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const m = o.material as Material & { transmission?: number };
      if ((m.transmission ?? 0) > 0) o.material = g;
    });
    return { object: clone, glass: g };
  }, [scene, light.color]);
  useEffect(() => () => glass.dispose(), [glass]);
  return (
    <>
      <group position={[p.x, p.y, p.z]} rotation-y={p.yaw} scale={p.scale}>
        <primitive object={object} />
      </group>
      <pointLight
        color={light.color}
        intensity={light.intensity}
        distance={light.distance}
        decay={light.decay}
        position={[...lightPosition]}
      />
    </>
  );
}

/** One cobweb card: mesh `index` of the pack, recentred, double-sided, no depth write. */
function CobwebCard({
  url,
  p,
  index,
}: {
  url: string;
  p: Placement & { mesh: number };
  index: number;
}) {
  const { scene } = useGLTF(url, false);
  const card = useMemo(() => {
    const meshes: Mesh[] = [];
    scene.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    const src = meshes[p.mesh];
    if (!src) {
      skip(url, `cobweb mesh ${p.mesh} missing (pack has ${meshes.length})`);
      return null;
    }
    const mesh = src.clone();
    const mat = (src.material as Material).clone();
    mat.side = DoubleSide;
    mat.transparent = true;
    mat.depthWrite = false;
    mesh.material = mat;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const box = new Box3().setFromObject(mesh);
    const center = box.getCenter(new Vector3());
    mesh.position.sub(center);
    return mesh;
  }, [scene, p.mesh, url]);
  if (!card) return null;
  return (
    <group key={index} position={[p.x, p.y, p.z]} rotation-y={p.yaw} scale={p.scale}>
      <primitive object={card} />
    </group>
  );
}

/** Low-poly rock: icosahedron detail 0 with a vertex jitter keyed by position, so seams stay closed. */
export function buildRubbleGeometry(seed = 7): BufferGeometry {
  const geo = new IcosahedronGeometry(1, 0);
  const pos = geo.getAttribute('position');
  const jitter = new Map<string, number>();
  const rnd = mulberry32(seed);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let j = jitter.get(k);
    if (j === undefined) {
      j = 0.75 + rnd() * 0.5;
      jitter.set(k, j);
    }
    pos.setXYZ(i, v.x * j, v.y * j, v.z * j);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function RubbleMesh({ items }: { items: readonly Placement[] }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => buildRubbleGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const textures = useTexture({
    map: assetUrl(ASSET_KEYS.lichenRock.diffuse) ?? '',
    normalMap: assetUrl(ASSET_KEYS.lichenRock.normal) ?? '',
    roughnessMap: assetUrl(ASSET_KEYS.lichenRock.rough) ?? '',
  });
  useEffect(() => {
    for (const [name, t] of Object.entries(textures)) {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      if (name === 'map') t.colorSpace = SRGBColorSpace;
      t.needsUpdate = true;
    }
  }, [textures]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const pos = new Vector3();
    const scl = new Vector3();
    const axis = new Vector3(0, 1, 0);
    items.forEach((it, i) => {
      q.setFromAxisAngle(axis, it.yaw);
      // Squashed rocks, half sunk into the soil.
      pos.set(it.x, it.y + it.scale * 0.25, it.z);
      scl.set(it.scale, it.scale * 0.6, it.scale * (0.8 + ((i * 37) % 5) * 0.08));
      mesh.setMatrixAt(i, m.compose(pos, q, scl));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, Math.max(1, items.length)]}
      castShadow
      receiveShadow
      name="props-rubble"
    >
      <meshStandardMaterial {...textures} />
    </instancedMesh>
  );
}

function Rubble({ items }: { items: readonly Placement[] }) {
  const keys = Object.values(ASSET_KEYS.lichenRock);
  const missing = keys.filter((k) => assetUrl(k) === null);
  useEffect(() => {
    missing.forEach((k) => skip(k, 'not in manifest'));
  }, [missing.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (missing.length > 0 || items.length === 0) return null;
  return (
    <ModelBoundary name="rubble" onError={(e) => skip('lichen-rock', e.message)}>
      <Suspense fallback={null}>
        <RubbleMesh items={items} />
      </Suspense>
    </ModelBoundary>
  );
}

function PropsContent({ layout }: { layout: GraveyardLayout }) {
  const r = useMemo(() => resolveProps(layout), [layout]);
  const stumpKeys = ASSET_KEYS.stumps;
  return (
    <>
      <PropSlot assetKey={ASSET_KEYS.gate}>
        {(u) => <GltfProp url={u} p={r.gate} silhouette />}
      </PropSlot>
      <PropSlot assetKey={ASSET_KEYS.statue}>{(u) => <GltfProp url={u} p={r.statue} />}</PropSlot>
      <PropSlot assetKey={ASSET_KEYS.trunk}>{(u) => <GltfProp url={u} p={r.trunk} />}</PropSlot>
      {r.stumps.map((s, i) => {
        const key = stumpKeys[s.model % stumpKeys.length] as string;
        return (
          <PropSlot key={i} assetKey={key}>
            {(u) => <GltfProp url={u} p={s} cast={false} />}
          </PropSlot>
        );
      })}
      <PropSlot assetKey={ASSET_KEYS.lantern}>
        {(u) => (
          <Lantern
            url={u}
            p={r.lantern}
            light={r.lantern.light}
            lightPosition={r.lantern.lightPosition}
          />
        )}
      </PropSlot>
      <Rubble items={r.rubble} />
      {r.cobwebs.map((c, i) => (
        <PropSlot key={i} assetKey={ASSET_KEYS.cobwebs}>
          {(u) => <CobwebCard url={u} p={c} index={i} />}
        </PropSlot>
      ))}
    </>
  );
}

/**
 * Hand-placed props (requirement 8). Loading starts from a requestAnimationFrame scheduled in
 * the first rendered frame (8.7). Missing or failed assets are skipped with a console warning.
 */
export function Props({ layout }: { layout: GraveyardLayout }) {
  const [framed, setFramed] = useState(false);
  const [go, setGo] = useState(false);
  const seen = useRef(false);

  useFrame(() => {
    if (seen.current) return;
    seen.current = true;
    setFramed(true);
  });

  // The rAF lives in an effect keyed on 'framed': if React re-runs the cleanup (StrictMode,
  // Suspense re-suspending) the effect schedules again instead of leaving the props unloaded.
  useEffect(() => {
    if (!framed) return undefined;
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, [framed]);

  return go ? <PropsContent layout={layout} /> : null;
}
