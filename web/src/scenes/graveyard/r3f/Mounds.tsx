import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Color, Euler, Matrix4, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import type { InstancedMesh, MeshStandardMaterial, Texture } from 'three';
import { useShockView } from '../../../state/shockView';
import { useStore } from '../../../state/store';
import { ASSET_KEYS, assetUrl } from '../assets';
import type { GraveyardLayout } from '../layout/layout';
import { planDressing } from '../model/dressing';
import { ModelBoundary } from './ModelBoundary';
import { lightsBlendRef } from './lightsBlend';
import { reportEnvironmentFailure } from './environmentFailure';
import { useVisibleStones } from './useVisibleStones';

/** Half-ellipsoid proportions: radius beyond the stone, and height of the heap (metres). */
const MOUND_HEIGHT = 0.24;
const MOUND_FRONT = 0.45;
const MOUND_SIDE = 0.2;
/** Lights-off tint (slightly red, wet soil); lights on is untinted (14.1, no red tint). */
const TINT_OFF = new Color(1, 0.8, 0.76);
const TINT_ON = new Color(1, 1, 1);
const SOIL_REPEAT = 1.5;

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

function soilUrl(key: string): string {
  const url = assetUrl(key);
  if (url === null) throw new Error(`Soil texture is not in the manifest: ${key}`);
  return url;
}

interface MoundMeshProps {
  firms: readonly number[];
  capacity: number;
  layout: GraveyardLayout;
  /** Soil maps; null draws a flat dark soil colour when the textures fail. */
  maps: { map: Texture; normalMap: Texture; roughnessMap: Texture } | null;
}

function MoundMesh({ firms, capacity, layout, maps }: MoundMeshProps) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const n = Math.min(firms.length, capacity);
    for (let k = 0; k < n; k++) {
      const s = layout.stones[firms[k]!];
      if (!s) continue;
      // Unit hemisphere scaled to a half-ellipsoid that wraps the stone base and reaches in front.
      const rz = s.depth / 2 + MOUND_FRONT;
      const rx = s.width / 2 + MOUND_SIDE;
      _p.set(s.x, -0.02, s.z);
      _e.set(0, s.yaw, 0, 'YXZ');
      _q.setFromEuler(_e);
      _s.set(rx, MOUND_HEIGHT, rz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(k, _m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [firms, capacity, layout]);

  // Tint follows the eased lights value (same ~0.35 s feel as the rest of the scene).
  useFrame(() => {
    mat.current?.color.lerpColors(TINT_OFF, TINT_ON, lightsBlendRef.current);
  });

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[undefined, undefined, capacity]}
      raycast={() => null}
      receiveShadow
      name="mounds"
    >
      <sphereGeometry args={[1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      {maps ? (
        <meshStandardMaterial ref={mat} {...maps} />
      ) : (
        <meshStandardMaterial ref={mat} color="#0b0806" />
      )}
    </instancedMesh>
  );
}

function SoilMounds(props: Omit<MoundMeshProps, 'maps'>) {
  const textures = useTexture({
    map: soilUrl(ASSET_KEYS.soil.diffuse),
    normalMap: soilUrl(ASSET_KEYS.soil.normal),
    roughnessMap: soilUrl(ASSET_KEYS.soil.rough),
  });
  // Clones share the image but keep their own repeat (Ground tiles the originals 120 times).
  const maps = useMemo(() => {
    const out = {
      map: textures.map.clone(),
      normalMap: textures.normalMap.clone(),
      roughnessMap: textures.roughnessMap.clone(),
    };
    for (const [name, t] of Object.entries(out)) {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(SOIL_REPEAT, SOIL_REPEAT);
      if (name === 'map') t.colorSpace = SRGBColorSpace;
      t.needsUpdate = true;
    }
    return out;
  }, [textures]);
  useEffect(
    () => () => {
      maps.map.dispose();
      maps.normalMap.dispose();
      maps.roughnessMap.dispose();
    },
    [maps],
  );
  return <MoundMesh {...props} maps={maps} />;
}

/**
 * One InstancedMesh of half-ellipsoid soil heaps, one per zombie or newly undead stone near the
 * camera, in both lights modes (6.5, 7.10, 14.1). Uses the soil PBR set already in the manifest.
 */
export function Mounds({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const lights = useStore((s) => s.settings.lights);
  const visible = useVisibleStones(layout);
  const [failed, setFailed] = useState(false);

  const mounds = useMemo(
    () => planDressing(firms, batch, lights).mounds.filter((i) => visible.has(i)),
    [firms, batch, lights, visible],
  );
  const capacity = Math.max(1, firms.length);
  const props = { firms: mounds, capacity, layout };

  if (failed) return <MoundMesh {...props} maps={null} />;
  return (
    <ModelBoundary
      name="mounds"
      onError={(e) => {
        reportEnvironmentFailure(e);
        setFailed(true);
      }}
    >
      <Suspense fallback={null}>
        <SoilMounds {...props} />
      </Suspense>
    </ModelBoundary>
  );
}
