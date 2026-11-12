import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { StoneMaterial } from '../../../fx/StoneMaterial';
import { useStore } from '../../../state/store';
import { useShockView } from '../../../state/shockView';
import { assetUrl } from '../assets';
import { buildGrid } from '../layout/grid';
import type { GraveyardLayout } from '../layout/layout';
import { VISIBLE_RADIUS, visibleStones } from '../layout/visible';
import { modelFor } from '../model/modelFor';
import { STONE_MODELS, type StoneModelId } from '../model/stoneModels';
import { ModelBoundary } from './ModelBoundary';
import { reportAssetError } from './reportAssetError';
import { buildStoneGeometry } from './stoneGeometry';

const MODEL_IDS: readonly StoneModelId[] = ['intact', 'cracked', 'broken'];
/** Decay tint per model; modest. */
const DECAY: Readonly<Record<StoneModelId, number>> = { intact: 0, cracked: 0.25, broken: 0.5 };
const DIM = 0.45;
/** Camera height above which the whole layout is written (overview). */
const OVERVIEW_Y = 25;
const KEY_CELL = 4;

interface Instances {
  /** Firm indices per model, in ascending order. */
  readonly byModel: Record<StoneModelId, number[]>;
}

interface ModelProps {
  id: StoneModelId;
  url: string;
  firms: readonly number[];
  capacity: number;
  layout: GraveyardLayout;
  dim: Uint8Array;
}

const _m = new Matrix4();
const _t = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
const _c = new Color();

function StoneModel({ id, url, firms, capacity, layout, dim }: ModelProps) {
  const gltf = useGLTF(url, false);
  const info = STONE_MODELS[id];
  const built = useMemo(
    () => buildStoneGeometry(gltf.scene, info.flapClip),
    [gltf.scene, info.flapClip],
  );
  useEffect(() => () => built.geometry.dispose(), [built]);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    _t.makeTranslation(-info.origin.x, -info.origin.y, -info.origin.z);
    const n = Math.min(firms.length, capacity);
    for (let k = 0; k < n; k++) {
      const s = layout.stones[firms[k]!];
      if (!s) continue;
      _p.set(s.x, -s.sink, s.z);
      _e.set(s.pitch, s.yaw, s.roll, 'YXZ');
      _q.setFromEuler(_e);
      _s.set(s.width / info.body.w, s.height / info.body.h, s.depth / info.body.d);
      _m.compose(_p, _q, _s).multiply(_t);
      mesh.setMatrixAt(k, _m);
      const g = dim[firms[k]!] ? DIM : 1;
      mesh.setColorAt(k, _c.setRGB(g, g, g));
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [firms, capacity, layout, dim, info]);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[built.geometry, undefined, capacity]}
      raycast={() => null}
      castShadow
      receiveShadow
      name={`stones-${id}`}
    >
      <StoneMaterial source={built.material} decay={DECAY[id]} />
    </instancedMesh>
  );
}

/** Exactly three instanced meshes (one per model), whatever the firm count (requirement 4.3). */
export function Stones({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const lights = useStore((s) => s.settings.lights);
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const [focus, setFocus] = useState({ x: 0, z: 0, overview: false });

  useFrame(({ camera }) => {
    const x = Math.round(camera.position.x / KEY_CELL) * KEY_CELL;
    const z = Math.round(camera.position.z / KEY_CELL) * KEY_CELL;
    const overview = camera.position.y > OVERVIEW_Y;
    setFocus((f) => (f.x === x && f.z === z && f.overview === overview ? f : { x, z, overview }));
  });

  const instances = useMemo<Instances>(() => {
    const radius = focus.overview ? Infinity : VISIBLE_RADIUS[lights];
    const byModel: Record<StoneModelId, number[]> = { intact: [], cracked: [], broken: [] };
    for (const i of visibleStones(grid, focus.x, focus.z, radius)) {
      const f = firms[i];
      if (!f) continue;
      byModel[modelFor(f.status, batch.newlyUndead[i] === 1)].push(i);
    }
    return { byModel };
  }, [grid, focus, lights, firms, batch]);

  const dim = useMemo(() => {
    const d = new Uint8Array(firms.length);
    firms.forEach((f, i) => {
      d[i] = f.status === 'insufficient_data' ? 1 : 0;
    });
    return d;
  }, [firms]);

  const capacity = Math.max(1, firms.length);
  return (
    <>
      {MODEL_IDS.map((id) => (
        <StoneSlot
          key={id}
          id={id}
          firms={instances.byModel[id]}
          capacity={capacity}
          layout={layout}
          dim={dim}
        />
      ))}
    </>
  );
}

function StoneSlot(props: Omit<ModelProps, 'url'>) {
  const key = STONE_MODELS[props.id].assetKey;
  const url = assetUrl(key);
  useEffect(() => {
    if (!url) reportAssetError(key);
  }, [url, key]);
  if (!url) return null;
  return (
    <ModelBoundary name={key} onError={(e) => reportAssetError(key, e)}>
      <Suspense fallback={null}>
        <StoneModel {...props} url={url} />
      </Suspense>
    </ModelBoundary>
  );
}
